import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { formatPKR, getMonthName, getInitials } from '../lib/utils';
import { Receipt, Search, Check, Calendar, Gift } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function FeeSubmission() {
  const { t, isUrdu } = useLanguage();
  const [users, setUsers] = useState([]);
  const [activeConfig, setActiveConfig] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [feeType, setFeeType] = useState('monthly');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [amount, setAmount] = useState('');
  const [extraDonation, setExtraDonation] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    fetchUsers();
    fetchActiveConfig();
  }, []);

  useEffect(() => {
    // Calculate amount based on fee type and selection
    if (activeConfig) {
      let baseAmount = 0;
      if (feeType === 'yearly') {
        baseAmount = activeConfig.monthly_amount * 12;
      } else {
        baseAmount = activeConfig.monthly_amount * selectedMonths.length;
      }
      const donation = parseFloat(extraDonation) || 0;
      setAmount((baseAmount + donation).toString());
    }
  }, [feeType, selectedMonths, activeConfig, extraDonation]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchActiveConfig = async () => {
    try {
      const response = await axios.get(`${API}/fee-config/active`);
      setActiveConfig(response.data);
      if (response.data) {
        setSelectedYear(response.data.year.toString());
      }
    } catch (error) {
      console.error('Failed to fetch active config:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast.error('Please select a member');
      return;
    }
    
    if (!selectedYear) {
      toast.error('Please select a year');
      return;
    }
    
    if (feeType === 'monthly' && selectedMonths.length === 0) {
      toast.error('Please select at least one month');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/fee-submissions`, {
        user_id: selectedUser,
        fee_type: feeType,
        months: feeType === 'yearly' ? months : selectedMonths,
        year: parseInt(selectedYear),
        amount: parseFloat(amount)
      });
      
      toast.success(t('feeSubmissionCreated'));
      setSelectedUser('');
      setFeeType('monthly');
      setSelectedMonths([]);
      setExtraDonation('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit fee');
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (month) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  const selectAllMonths = () => {
    if (selectedMonths.length === 12) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths(months);
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || phone.includes(search);
  });

  const selectedUserData = users.find(u => u.id === selectedUser);
  const baseAmount = activeConfig ? (feeType === 'yearly' ? activeConfig.monthly_amount * 12 : activeConfig.monthly_amount * selectedMonths.length) : 0;

  if (!activeConfig) {
    return (
      <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`}>
        <Card className="border-0 bg-amber-50">
          <CardContent className="p-6 text-center">
            <Calendar className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-amber-800">No Fee Configuration Set</h2>
            <p className="text-amber-700 mt-2">Please set a monthly fee configuration first before collecting fees.</p>
            <Button 
              className="mt-4 bg-amber-600 hover:bg-amber-700"
              onClick={() => window.location.href = '/monthly-fees'}
            >
              Go to Fee Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`} data-testid="fee-submission-page">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          {t('feeCollection')}
        </h1>
        <p className="text-slate-500 mt-1">{t('collectFeeOnBehalf')}</p>
      </div>

      {/* Current Fee Info */}
      <Card className="border-0 bg-emerald-50">
        <CardContent className="p-4">
          <div className={`flex items-center justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
            <div className={isUrdu ? 'text-right' : ''}>
              <p className="text-sm text-emerald-700 font-medium">Current Fee ({activeConfig.year})</p>
              <p className="text-xs text-emerald-600">Monthly: {formatPKR(activeConfig.monthly_amount)} | Yearly: {formatPKR(activeConfig.monthly_amount * 12)}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
            <Receipt className="w-5 h-5 text-emerald-600" />
            {t('feeCollectionForm')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700">{t('selectMember')}</Label>
              <div className="relative mb-2">
                <Search className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                <Input
                  placeholder={t('searchByNamePhone')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${isUrdu ? 'pr-10 text-right' : 'pl-10'} h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white`}
                  data-testid="user-search-input"
                />
              </div>
              
              <div className="max-h-[180px] overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUser(user.id)}
                      data-testid={`user-option-${user.id}`}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        selectedUser === user.id
                          ? 'bg-emerald-50 border-2 border-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100'
                      } ${isUrdu ? 'flex-row-reverse text-right' : ''}`}
                    >
                      <div className="user-avatar text-sm">
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                      <div className={`flex-1 min-w-0 ${isUrdu ? 'text-right' : ''}`}>
                        <p className="font-medium text-slate-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-slate-500" dir="ltr">{user.phone || 'No phone'}</p>
                      </div>
                      {selectedUser === user.id && (
                        <Check className="w-5 h-5 text-emerald-600" />
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-4">{t('noMembersFound')}</p>
                )}
              </div>
            </div>

            {/* Selected User Display */}
            {selectedUserData && (
              <div className={`p-4 bg-emerald-50 rounded-xl ${isUrdu ? 'text-right' : ''}`}>
                <p className="text-sm text-emerald-700 font-medium">{t('selectedMember')}</p>
                <p className="text-lg font-semibold text-emerald-800">
                  {selectedUserData.first_name} {selectedUserData.last_name}
                </p>
              </div>
            )}

            {/* Year Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700">{t('year')}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50" data-testid="year-select">
                  <SelectValue placeholder={t('selectYear')} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fee Type Selection */}
            <div className="space-y-3">
              <Label className="text-slate-700">Fee Type</Label>
              <RadioGroup value={feeType} onValueChange={(v) => { setFeeType(v); setSelectedMonths([]); }}>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      feeType === 'monthly' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                    } ${isUrdu ? 'flex-row-reverse' : ''}`}
                    data-testid="fee-type-monthly"
                  >
                    <RadioGroupItem value="monthly" />
                    <div className={isUrdu ? 'text-right' : ''}>
                      <p className="font-medium text-slate-900">Monthly</p>
                      <p className="text-xs text-slate-500" dir="ltr">{formatPKR(activeConfig.monthly_amount)}/month</p>
                    </div>
                  </label>
                  <label 
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      feeType === 'yearly' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                    } ${isUrdu ? 'flex-row-reverse' : ''}`}
                    data-testid="fee-type-yearly"
                  >
                    <RadioGroupItem value="yearly" />
                    <div className={isUrdu ? 'text-right' : ''}>
                      <p className="font-medium text-slate-900">Yearly</p>
                      <p className="text-xs text-slate-500" dir="ltr">{formatPKR(activeConfig.monthly_amount * 12)}/year</p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Month Selection (for monthly type) */}
            {feeType === 'monthly' && (
              <div className="space-y-3">
                <div className={`flex items-center justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
                  <Label className="text-slate-700">Select Months</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={selectAllMonths}
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    {selectedMonths.length === 12 ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {months.map((month) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => toggleMonth(month)}
                      data-testid={`month-${month}`}
                      className={`p-3 rounded-xl text-center transition-all ${
                        selectedMonths.includes(month)
                          ? 'bg-emerald-100 border-2 border-emerald-300 text-emerald-700'
                          : 'bg-slate-50 border-2 border-transparent text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-sm font-medium">{getMonthName(month).slice(0, 3)}</p>
                      {selectedMonths.includes(month) && (
                        <Check className="w-4 h-4 mx-auto mt-1 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Donation */}
            <div className="space-y-2">
              <Label className={`text-slate-700 flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                <Gift className="w-4 h-4 text-amber-500" />
                Extra Donation (Optional)
              </Label>
              <div className="relative">
                <span className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-500 font-medium`}>PKR</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={extraDonation}
                  onChange={(e) => setExtraDonation(e.target.value)}
                  className={`${isUrdu ? 'pr-14' : 'pl-14'} h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white`}
                  min="0"
                  step="100"
                  data-testid="donation-input"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-slate-500">Members can donate more than the required fee amount</p>
            </div>

            {/* Total Amount Preview */}
            {(feeType === 'yearly' || selectedMonths.length > 0) && (
              <div className="p-4 bg-slate-100 rounded-xl space-y-2">
                <p className="text-sm text-slate-600 font-medium">Payment Summary</p>
                <div className={`space-y-1 ${isUrdu ? 'text-right' : ''}`}>
                  <div className={`flex justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
                    <span className="text-slate-600">
                      {feeType === 'yearly' ? 'Yearly Fee (12 months)' : `Monthly Fee (${selectedMonths.length} month${selectedMonths.length > 1 ? 's' : ''})`}
                    </span>
                    <span className="font-medium" dir="ltr">{formatPKR(baseAmount)}</span>
                  </div>
                  {parseFloat(extraDonation) > 0 && (
                    <div className={`flex justify-between text-amber-600 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                      <span>Extra Donation</span>
                      <span className="font-medium" dir="ltr">+{formatPKR(parseFloat(extraDonation))}</span>
                    </div>
                  )}
                  <div className={`flex justify-between pt-2 border-t border-slate-300 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="font-bold text-emerald-700 text-lg" dir="ltr">{formatPKR(parseFloat(amount) || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !selectedUser || !selectedYear || (feeType === 'monthly' && selectedMonths.length === 0)}
              className="w-full h-12 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              data-testid="submit-fee-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Receipt className={`w-5 h-5 ${isUrdu ? 'ml-2' : 'mr-2'}`} />
                  {t('submitForApproval')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 bg-blue-50">
        <CardContent className="p-4">
          <p className={`text-sm text-blue-700 ${isUrdu ? 'text-right' : ''}`}>
            <strong>{isUrdu ? 'نوٹ:' : 'Note:'}</strong> {t('feeSubmissionNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
