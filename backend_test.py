import requests
import sys
import json
from datetime import datetime
import time

class CommunityFundAPITester:
    def __init__(self, base_url="https://fund-manager-app-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.super_admin_token = None
        self.admin_token = None
        self.member_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_user_id = None
        self.member_user_id = None

    def log_test(self, name, success, response_data=None, error_msg=None):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"\n{status} - {name}")
        
        if success:
            self.tests_passed += 1
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
        else:
            self.failed_tests.append(name)
            if error_msg:
                print(f"   Error: {error_msg}")
        
        return success

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return success, response_data, response.status_code
            
        except Exception as e:
            return False, None, f"Request failed: {str(e)}"

    def test_health_check(self):
        """Test API health check"""
        success, data, status = self.make_request('GET', '')
        return self.log_test("Health Check", success and data.get('status') == 'healthy', data)

    def test_super_admin_login(self):
        """Test Super Admin login"""
        login_data = {
            "phone": "+923142256184",
            "pin": "1234"
        }
        
        success, data, status = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'token' in data:
            self.super_admin_token = data['token']
            user_data = data.get('user', {})
            success = user_data.get('role') == 'super_admin'
            
        return self.log_test("Super Admin Login", success, data)

    def test_invalid_login(self):
        """Test invalid login credentials"""
        login_data = {
            "phone": "+923142256184",
            "pin": "9999"
        }
        
        success, data, status = self.make_request('POST', 'auth/login', login_data, expected_status=401)
        return self.log_test("Invalid Login (Correct Behavior)", success, data)

    def test_signup_validation(self):
        """Test signup with Pakistani phone validation"""
        # Test invalid phone format
        signup_data = {
            "phone": "+1234567890",  # US format
            "first_name": "Test",
            "last_name": "User",
            "pin": "1234"
        }
        
        success, data, status = self.make_request('POST', 'auth/signup', signup_data, expected_status=400)
        invalid_phone_test = success
        
        # Test valid Pakistani phone signup
        timestamp = int(time.time())
        signup_data = {
            "phone": f"+9231{timestamp % 100000000}",  # Valid Pakistani format
            "first_name": "Test",
            "last_name": "Member",
            "pin": "5678"
        }
        
        success, data, status = self.make_request('POST', 'auth/signup', signup_data, expected_status=200)
        
        if success and 'token' in data:
            self.member_token = data['token']
            self.member_user_id = data['user']['id']
            
        signup_success = success and invalid_phone_test
        return self.log_test("Signup Validation (Pakistani Phone)", signup_success, data)

    def test_add_member_endpoint(self):
        """Test Super Admin add member functionality"""
        if not self.super_admin_token:
            return self.log_test("Add Member Endpoint", False, error_msg="No super admin token")
        
        # Test add member with phone
        timestamp = int(time.time())
        member_data = {
            "first_name": "John",
            "last_name": "Doe",
            "phone": f"+9233{timestamp % 100000000}"  # Valid Pakistani format
        }
        
        success1, data1, status1 = self.make_request('POST', 'users/add-member', member_data, token=self.super_admin_token)
        
        # Test add member without phone (optional)
        member_data_no_phone = {
            "first_name": "Jane",
            "last_name": "Smith"
        }
        
        success2, data2, status2 = self.make_request('POST', 'users/add-member', member_data_no_phone, token=self.super_admin_token)
        
        success = success1 and success2
        return self.log_test("Add Member Endpoint", success, data1)

    def test_user_management(self):
        if not self.super_admin_token:
            return self.log_test("User Management", False, error_msg="No super admin token")
        
        # Get users list
        success, users_data, status = self.make_request('GET', 'users', token=self.super_admin_token)
        
        if not success:
            return self.log_test("User Management", False, error_msg="Failed to get users")
        
        # Find a member to promote
        member_user = None
        for user in users_data:
            if user['role'] == 'member' and user['id'] != self.member_user_id:
                member_user = user
                break
        
        if not member_user and self.member_user_id:
            # Use the member we created
            member_user = {'id': self.member_user_id}
        
        if member_user:
            # Promote user to admin
            promote_data = {"user_id": member_user['id']}
            success, data, status = self.make_request('POST', 'users/promote', promote_data, token=self.super_admin_token)
            
            if success:
                self.admin_user_id = member_user['id']
                
        return self.log_test("User Management - Promote to Admin", success, data)

    def test_fee_config(self):
        """Test fee configuration management"""
        if not self.super_admin_token:
            return self.log_test("Fee Config", False, error_msg="No super admin token")
        
        # Set fee configuration (PKR 200/month for current year)
        current_year = datetime.now().year
        fee_config_data = {
            "year": current_year,
            "monthly_amount": 200.0
        }
        
        success, data, status = self.make_request('POST', 'fee-config', fee_config_data, token=self.super_admin_token)
        
        if success:
            # Get all fee configs
            success2, data2, status2 = self.make_request('GET', 'fee-config', token=self.super_admin_token)
            
            # Get active fee config
            success3, active_config, status3 = self.make_request('GET', 'fee-config/active', token=self.super_admin_token)
            
            # Verify active config has correct values
            config_valid = (active_config and 
                          active_config.get('monthly_amount') == 200.0 and
                          active_config.get('year') == current_year and
                          active_config.get('is_active') == True)
            
            success = success and success2 and success3 and config_valid
            
        return self.log_test("Fee Configuration Management", success, data)

    def test_fee_submission(self):
        """Test fee submission workflow with new structure"""
        if not self.super_admin_token or not self.member_user_id:
            return self.log_test("Fee Submission", False, error_msg="Missing tokens or user ID")
        
        current_year = datetime.now().year
        
        # Test monthly fee submission (specific months)
        monthly_submission_data = {
            "user_id": self.member_user_id,
            "fee_type": "monthly",
            "months": [1, 2, 3],  # First 3 months
            "year": current_year,
            "amount": 600.0  # 3 months × PKR 200 = PKR 600
        }
        
        success, data, status = self.make_request('POST', 'fee-submissions', monthly_submission_data, token=self.super_admin_token)
        print(f"Monthly submission status: {status}, success: {success}")
        print(f"Monthly submission response: {data}")
        
        monthly_submission_id = None
        
        if success and 'id' in data:
            monthly_submission_id = data['id']
            
            # Verify submission details
            expected_defined_amount = data.get('defined_amount', 0)
            extra_donation = data.get('extra_donation', 0)
            amounts_valid = expected_defined_amount == 600.0 and extra_donation == 0
            success = success and amounts_valid
        elif not success:
            return self.log_test("Fee Submission (Monthly & Yearly)", False, error_msg=f"Monthly submission failed: {data}")
        
        # Test yearly fee submission with extra donation (use different user to avoid month conflicts)
        # First, let me create another test member for yearly submission
        timestamp = int(time.time())
        test_user_data = {
            "first_name": "Test", 
            "last_name": "Yearly",
            "phone": f"+9234{timestamp % 100000000}"
        }
        user_success, user_data, user_status = self.make_request('POST', 'users/add-member', test_user_data, token=self.super_admin_token)
        
        if user_success and 'user_id' in user_data:
            yearly_user_id = user_data['user_id']
            
            yearly_submission_data = {
                "user_id": yearly_user_id,
                "fee_type": "yearly",  
                "months": [],  # Will be ignored for yearly
                "year": current_year,  # Same year as fee config
                "amount": 2900.0  # PKR 2400 (12×200) + PKR 500 donation
            }
            
            success2, data2, status2 = self.make_request('POST', 'fee-submissions', yearly_submission_data, token=self.super_admin_token)
            print(f"Yearly submission status: {status2}, success: {success2}")
            print(f"Yearly submission response: {data2}")
            
            if success2:
                # Verify yearly submission includes all 12 months and calculates donation
                expected_defined_amount = data2.get('defined_amount', 0)  # Should be 2400
                extra_donation = data2.get('extra_donation', 0)  # Should be 500
                
                yearly_valid = expected_defined_amount == 2400.0 and extra_donation == 500.0
                success2 = success2 and yearly_valid
            elif not success2:
                return self.log_test("Fee Submission (Monthly & Yearly)", False, error_msg=f"Yearly submission failed: {data2}")
        else:
            return self.log_test("Fee Submission (Monthly & Yearly)", False, error_msg="Failed to create test user for yearly submission")
            
        # Get all fee submissions
        success3, submissions, status3 = self.make_request('GET', 'fee-submissions', token=self.super_admin_token)
        
        final_success = success and success2 and success3
        return self.log_test("Fee Submission (Monthly & Yearly)", final_success, data)

    def test_fund_categories(self):
        """Test fund allocation categories"""
        success, data, status = self.make_request('GET', 'fund-categories')
        
        expected_categories = ['school_fee', 'health_expenses', 'emergency']
        categories_valid = success and all(cat in data for cat in expected_categories)
        
        return self.log_test("Fund Categories", categories_valid, data)

    def test_fund_allocation(self):
        """Test fund allocation workflow with recipient name/phone"""
        if not self.super_admin_token:
            return self.log_test("Fund Allocation", False, error_msg="Missing super admin token")
        
        # Create fund allocation with new model (recipient_name, recipient_phone)
        allocation_data = {
            "recipient_name": "Ahmad Khan",
            "recipient_phone": "+923001234567",
            "category": "emergency",
            "amount": 10000.0,
            "description": "Emergency medical assistance"
        }
        
        success, data, status = self.make_request('POST', 'fund-allocations', allocation_data, token=self.super_admin_token)
        
        if success:
            # Get fund allocations
            success2, allocations, status2 = self.make_request('GET', 'fund-allocations', token=self.super_admin_token)
            success = success and success2
            
        return self.log_test("Fund Allocation (New Model)", success, data)

    def test_dashboard_endpoints(self):
        """Test dashboard data endpoints"""
        if not self.super_admin_token:
            return self.log_test("Dashboard Endpoints", False, error_msg="No super admin token")
        
        # Test admin dashboard
        success1, admin_data, status1 = self.make_request('GET', 'dashboard/admin', token=self.super_admin_token)
        
        # Test member dashboard with member token if available
        member_success = True
        if self.member_token:
            member_success, member_data, status2 = self.make_request('GET', 'dashboard/member', token=self.member_token)
        
        success = success1 and member_success
        expected_fields = ['total_collection', 'total_expense', 'total_remaining']
        
        if success1 and admin_data:
            fields_present = all(field in admin_data for field in expected_fields)
            success = success and fields_present
            
        return self.log_test("Dashboard Endpoints", success, admin_data)

    def test_notifications(self):
        """Test notifications endpoints"""
        if not self.super_admin_token:
            return self.log_test("Notifications", False, error_msg="No super admin token")
        
        # Get notifications
        success1, data1, status1 = self.make_request('GET', 'notifications', token=self.super_admin_token)
        
        # Get unread count
        success2, data2, status2 = self.make_request('GET', 'notifications/unread-count', token=self.super_admin_token)
        
        success = success1 and success2
        count_valid = success2 and 'count' in data2
        
        return self.log_test("Notifications", success and count_valid, data2)

    def test_auth_protection(self):
        """Test authentication protection on protected endpoints"""
        # Try to access protected endpoint without token
        success, data, status = self.make_request('GET', 'users', expected_status=403)
        
        # Should fail with 403 (Forbidden) or 401 (Unauthorized)
        auth_protection_working = status in [401, 403]
        
        return self.log_test("Auth Protection", auth_protection_working, data)

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Community Fund Management API Tests")
        print(f"Testing API at: {self.base_url}")
        print("=" * 60)
        
        # Core functionality tests
        test_methods = [
            self.test_health_check,
            self.test_super_admin_login,
            self.test_invalid_login,
            self.test_signup_validation,
            self.test_auth_protection,
            self.test_add_member_endpoint,
            self.test_user_management,
            self.test_fee_config,  # Updated test
            self.test_fee_submission,  # Updated test
            self.test_fund_categories,
            self.test_fund_allocation,
            self.test_dashboard_endpoints,
            self.test_notifications
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_test(test_method.__name__, False, error_msg=f"Exception: {str(e)}")
            
            time.sleep(0.5)  # Brief pause between tests
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failed_test in self.failed_tests:
                print(f"   - {failed_test}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = CommunityFundAPITester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())