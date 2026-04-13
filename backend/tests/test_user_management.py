"""
Backend API Tests for Hussain Maat Foundation - User Management and Bulk Approvals
Tests cover: User CRUD, toggle-status, bulk-action, bulk-approve for fees and allocations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConfig:
    """Test configuration"""
    SUPER_ADMIN_PHONE = "+923142256184"
    SUPER_ADMIN_PIN = "1234"
    test_user_ids = []
    auth_token = None


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for Super Admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "phone": TestConfig.SUPER_ADMIN_PHONE,
        "pin": TestConfig.SUPER_ADMIN_PIN
    })
    if response.status_code == 200:
        token = response.json().get("token")
        TestConfig.auth_token = token
        return token
    pytest.fail(f"Authentication failed: {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_api_health(self, api_client):
        """Test API health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("SUCCESS: API health check passed")

    def test_super_admin_login(self, api_client):
        """Test Super Admin login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TestConfig.SUPER_ADMIN_PHONE,
            "pin": TestConfig.SUPER_ADMIN_PIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "super_admin"
        print("SUCCESS: Super Admin login successful")


class TestUserManagement:
    """User CRUD operations - PUT /api/users/{user_id}, DELETE, toggle-status"""
    
    def test_get_users_list(self, authenticated_client):
        """Test GET /api/users - list all users"""
        response = authenticated_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} users from the system")
    
    def test_add_member(self, authenticated_client):
        """Test POST /api/users/add-member - Add a new test member"""
        response = authenticated_client.post(f"{BASE_URL}/api/users/add-member", json={
            "first_name": "TEST_Member",
            "last_name": "ForUpdate",
            "phone": "+923001234567"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        TestConfig.test_user_ids.append(data["user_id"])
        print(f"SUCCESS: Added test member with ID: {data['user_id']}")
    
    def test_update_user(self, authenticated_client):
        """Test PUT /api/users/{user_id} - Update user details"""
        if not TestConfig.test_user_ids:
            pytest.skip("No test user created")
        
        user_id = TestConfig.test_user_ids[0]
        response = authenticated_client.put(f"{BASE_URL}/api/users/{user_id}", json={
            "first_name": "TEST_Updated",
            "last_name": "Name",
            "phone": "+923001234568"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Updated user {user_id}")
        
        # Verify the update by fetching users
        users_response = authenticated_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        updated_user = next((u for u in users if u["id"] == user_id), None)
        assert updated_user is not None
        assert updated_user["first_name"] == "TEST_Updated"
        print("SUCCESS: Verified user update persisted")
    
    def test_update_user_not_found(self, authenticated_client):
        """Test PUT /api/users/{user_id} - User not found"""
        response = authenticated_client.put(f"{BASE_URL}/api/users/nonexistent-user-id", json={
            "first_name": "Test",
            "last_name": "User",
            "phone": None
        })
        assert response.status_code == 404
        print("SUCCESS: Correctly returned 404 for non-existent user")
    
    def test_toggle_user_status(self, authenticated_client):
        """Test POST /api/users/{user_id}/toggle-status - Disable/Enable user"""
        if not TestConfig.test_user_ids:
            pytest.skip("No test user created")
        
        user_id = TestConfig.test_user_ids[0]
        
        # Disable user
        response = authenticated_client.post(f"{BASE_URL}/api/users/{user_id}/toggle-status")
        assert response.status_code == 200
        data = response.json()
        assert "is_disabled" in data
        first_status = data["is_disabled"]
        print(f"SUCCESS: User status toggled - is_disabled: {first_status}")
        
        # Toggle again to enable
        response = authenticated_client.post(f"{BASE_URL}/api/users/{user_id}/toggle-status")
        assert response.status_code == 200
        data = response.json()
        assert data["is_disabled"] != first_status
        print(f"SUCCESS: User status toggled again - is_disabled: {data['is_disabled']}")
    
    def test_toggle_status_not_found(self, authenticated_client):
        """Test toggle-status for non-existent user"""
        response = authenticated_client.post(f"{BASE_URL}/api/users/nonexistent-id/toggle-status")
        assert response.status_code == 404
        print("SUCCESS: Correctly returned 404 for non-existent user toggle")
    
    def test_promote_user(self, authenticated_client):
        """Test POST /api/users/promote - Change user role"""
        if not TestConfig.test_user_ids:
            pytest.skip("No test user created")
        
        user_id = TestConfig.test_user_ids[0]
        response = authenticated_client.post(f"{BASE_URL}/api/users/promote", json={
            "user_id": user_id
        })
        assert response.status_code == 200
        data = response.json()
        assert "new_role" in data
        print(f"SUCCESS: User role changed to {data['new_role']}")
        
        # Toggle back
        authenticated_client.post(f"{BASE_URL}/api/users/promote", json={"user_id": user_id})


class TestBulkUserActions:
    """Bulk user action tests - POST /api/users/bulk-action"""
    
    def test_create_test_users_for_bulk(self, authenticated_client):
        """Create test users for bulk action testing"""
        for i in range(2):
            response = authenticated_client.post(f"{BASE_URL}/api/users/add-member", json={
                "first_name": f"TEST_Bulk{i}",
                "last_name": "User",
                "phone": None
            })
            if response.status_code == 200:
                TestConfig.test_user_ids.append(response.json()["user_id"])
        print(f"SUCCESS: Created {len(TestConfig.test_user_ids)} test users for bulk testing")
    
    def test_bulk_disable_users(self, authenticated_client):
        """Test bulk disable action"""
        if len(TestConfig.test_user_ids) < 2:
            pytest.skip("Not enough test users")
        
        response = authenticated_client.post(f"{BASE_URL}/api/users/bulk-action", json={
            "user_ids": TestConfig.test_user_ids[:2],
            "action": "disable"
        })
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"SUCCESS: Bulk disabled {data['count']} users")
    
    def test_bulk_enable_users(self, authenticated_client):
        """Test bulk enable action"""
        if len(TestConfig.test_user_ids) < 2:
            pytest.skip("Not enough test users")
        
        response = authenticated_client.post(f"{BASE_URL}/api/users/bulk-action", json={
            "user_ids": TestConfig.test_user_ids[:2],
            "action": "enable"
        })
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"SUCCESS: Bulk enabled {data['count']} users")
    
    def test_bulk_action_empty_list(self, authenticated_client):
        """Test bulk action with empty user list"""
        response = authenticated_client.post(f"{BASE_URL}/api/users/bulk-action", json={
            "user_ids": [],
            "action": "disable"
        })
        assert response.status_code == 400
        print("SUCCESS: Correctly rejected empty user list")


class TestDisabledUserLogin:
    """Test that disabled users cannot login"""
    
    def test_disabled_user_cannot_login(self, api_client, authenticated_client):
        """Disabled users should get 403 on login attempt"""
        # Create a test user with known credentials
        response = authenticated_client.post(f"{BASE_URL}/api/auth/signup", json={
            "phone": "+923009999888",
            "first_name": "TEST_Disabled",
            "last_name": "LoginTest",
            "pin": "1234"
        })
        
        if response.status_code == 200:
            user_data = response.json()
            user_id = user_data["user"]["id"]
            TestConfig.test_user_ids.append(user_id)
            
            # Disable the user
            authenticated_client.post(f"{BASE_URL}/api/users/{user_id}/toggle-status")
            
            # Try to login as disabled user
            login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
                "phone": "+923009999888",
                "pin": "1234"
            })
            assert login_response.status_code == 403
            assert "disabled" in login_response.json().get("detail", "").lower()
            print("SUCCESS: Disabled user correctly blocked from login")
            
            # Re-enable for cleanup
            authenticated_client.post(f"{BASE_URL}/api/users/{user_id}/toggle-status")
        elif response.status_code == 400 and "already registered" in response.text:
            print("INFO: Test phone already registered, skipping disabled login test")
        else:
            print(f"WARNING: Could not create test user for disabled login test: {response.status_code}")


class TestBulkFeeApprovals:
    """Bulk approval tests for fee submissions - POST /api/fee-submissions/bulk-approve"""
    
    def test_get_pending_fee_submissions(self, authenticated_client):
        """Get pending fee submissions for bulk testing"""
        response = authenticated_client.get(f"{BASE_URL}/api/fee-submissions?status=pending")
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Found {len(data)} pending fee submissions")
    
    def test_bulk_approve_fees_empty(self, authenticated_client):
        """Test bulk approve with empty list should still work"""
        response = authenticated_client.post(f"{BASE_URL}/api/fee-submissions/bulk-approve", json={
            "ids": [],
            "action": "approve",
            "comment": None
        })
        assert response.status_code == 200
        data = response.json()
        assert data["processed"] == 0
        print("SUCCESS: Bulk approve with empty list handled correctly")
    
    def test_bulk_approve_fees_structure(self, authenticated_client):
        """Test bulk approve API structure is correct"""
        # Get any pending submissions
        pending = authenticated_client.get(f"{BASE_URL}/api/fee-submissions?status=pending")
        submissions = pending.json()
        
        if not submissions:
            print("INFO: No pending fee submissions to test bulk approve")
            return
        
        # Just test that the API accepts the correct format
        response = authenticated_client.post(f"{BASE_URL}/api/fee-submissions/bulk-approve", json={
            "ids": [submissions[0]["id"]],
            "action": "approve",
            "comment": "Test bulk approval"
        })
        # Could be 200 (success) or items already voted on
        assert response.status_code == 200
        print(f"SUCCESS: Bulk fee approve API works - processed: {response.json().get('processed', 0)}")


class TestBulkAllocationApprovals:
    """Bulk approval tests for fund allocations - POST /api/fund-allocations/bulk-approve"""
    
    def test_get_pending_allocations(self, authenticated_client):
        """Get pending fund allocations"""
        response = authenticated_client.get(f"{BASE_URL}/api/fund-allocations?status=pending")
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Found {len(data)} pending fund allocations")
    
    def test_bulk_approve_allocations_empty(self, authenticated_client):
        """Test bulk approve allocations with empty list"""
        response = authenticated_client.post(f"{BASE_URL}/api/fund-allocations/bulk-approve", json={
            "ids": [],
            "action": "approve",
            "comment": None
        })
        assert response.status_code == 200
        data = response.json()
        assert data["processed"] == 0
        print("SUCCESS: Bulk allocation approve with empty list handled correctly")
    
    def test_bulk_approve_allocations_structure(self, authenticated_client):
        """Test bulk allocation approve API structure"""
        # Get any pending allocations
        pending = authenticated_client.get(f"{BASE_URL}/api/fund-allocations?status=pending")
        allocations = pending.json()
        
        if not allocations:
            print("INFO: No pending allocations to test bulk approve")
            return
        
        response = authenticated_client.post(f"{BASE_URL}/api/fund-allocations/bulk-approve", json={
            "ids": [allocations[0]["id"]],
            "action": "approve",
            "comment": "Test bulk approval"
        })
        assert response.status_code == 200
        print(f"SUCCESS: Bulk allocation approve API works - processed: {response.json().get('processed', 0)}")


class TestDeleteUser:
    """Delete user tests - DELETE /api/users/{user_id}"""
    
    def test_delete_user(self, authenticated_client):
        """Test DELETE /api/users/{user_id}"""
        if not TestConfig.test_user_ids:
            pytest.skip("No test users to delete")
        
        user_id = TestConfig.test_user_ids.pop()
        response = authenticated_client.delete(f"{BASE_URL}/api/users/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Deleted user {user_id}")
        
        # Verify deletion
        users_response = authenticated_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        deleted_user = next((u for u in users if u["id"] == user_id), None)
        assert deleted_user is None
        print("SUCCESS: Verified user deletion persisted")
    
    def test_delete_user_not_found(self, authenticated_client):
        """Test delete non-existent user"""
        response = authenticated_client.delete(f"{BASE_URL}/api/users/nonexistent-id")
        assert response.status_code == 404
        print("SUCCESS: Correctly returned 404 for non-existent user delete")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_users(self, authenticated_client):
        """Delete any remaining test users"""
        deleted_count = 0
        for user_id in TestConfig.test_user_ids[:]:
            response = authenticated_client.delete(f"{BASE_URL}/api/users/{user_id}")
            if response.status_code == 200:
                TestConfig.test_user_ids.remove(user_id)
                deleted_count += 1
        print(f"SUCCESS: Cleaned up {deleted_count} test users")
