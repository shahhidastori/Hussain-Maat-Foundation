import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { formatPKR } from '../lib/utils';
import { Calendar, Check, Settings } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MonthlyFees() {
  const { t, isUrdu } = useLanguage();
  const [feeConfigs, setFeeConfigs] = useState([]);
  const [activeConfig, setActiveConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  useEffect(() => {
    fetchFeeConfigs();
  }, []);

  const fetchFeeConfigs = async () => {
    try {
      const [configsRes, activeRes] = await Promise.all([
        axios.get(`${API}/fee-config`),
        axios.get(`${API}/fee-config/active`)
      ]);
      setFeeConfigs(configsRes.data);
      setActiveConfig(activeRes.data);
      
      // Pre-fill form with active config
      if (activeRes.data) {
        setSelectedYear(activeRes.data.year.toString());
        setMonthlyAmount(activeRes.data.monthly_amount.toString());
      } else {
        setSelectedYear(currentYear.toString());
      }
    } catch (error) {
      console.error('Failed to fetch fee configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedYear) {
      toast.error('Please select a year');
      return;
    }
    
    if (!monthlyAmount || parseFloat(monthlyAmount) <= 0) {
      toast.error('Please enter a valid monthly amount');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/fee-config`, {
        year: parseInt(selectedYear),
        monthly_amount: parseFloat(monthlyAmount)
      });
      
      toast.success(t('feeSetSuccess'));
      fetchFeeConfigs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set fee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loader"></div>
      </div>
    );
  }

  const yearlyAmount = monthlyAmount ? parseFloat(monthlyAmount) * 12 : 0;

  return (
    <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`} data-testid="monthly-fees-page">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          {t('monthlyFeesTitle')}
        </h1>
        <p className="text-slate-500 mt-1">{t('setManageMonthlyFees')}</p>
      </div>

      {/* Active Fee Display */}
      {activeConfig && (
        <Card className="border-0 bg-gradient-to-r from-emerald-600 to-green-600 text-white" data-testid="active-fee-card">
          <CardContent className="p-6">
            <div className={`flex items-center gap-2 mb-2 ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <Check className="w-5 h-5" />
              <span className="text-emerald-100 font-medium">Active Fee Configuration</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className={isUrdu ? 'text-right' : ''}>
                <p className="text-emerald-100 text-sm">Monthly Fee</p>
                <p className="text-3xl font-bold" dir="ltr">{formatPKR(activeConfig.monthly_amount)}</p>
              </div>
              <div className={isUrdu ? 'text-right' : ''}>
                <p className="text-emerald-100 text-sm">Yearly Fee (12 months)</p>
                <p className="text-3xl font-bold" dir="ltr">{formatPKR(activeConfig.monthly_amount * 12)}</p>
              </div>
            </div>
            <p className="text-emerald-100 text-sm mt-4">Year: {activeConfig.year}</p>
          </CardContent>
        </Card>
      )}

      {/* Set Fee Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
            <Settings className="w-5 h-5 text-emerald-600" />
            {t('setMonthlyFeeTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">{t('year')}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50" data-testid="fee-year-select">
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

            <div className="space-y-2">
              <Label className="text-slate-700">Monthly Fee Amount (PKR)</Label>
              <div className="relative">
                <span className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-500 font-medium`}>PKR</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  className={`${isUrdu ? 'pr-14' : 'pl-14'} h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-lg font-semibold`}
                  min="0"
                  step="50"
                  data-testid="fee-amount-input"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Preview */}
            {monthlyAmount && parseFloat(monthlyAmount) > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <p className="text-sm text-slate-600 font-medium">Fee Preview:</p>
                <div className={`grid grid-cols-2 gap-4 ${isUrdu ? 'text-right' : ''}`}>
                  <div>
                    <p className="text-xs text-slate-500">Monthly</p>
                    <p className="text-lg font-bold text-slate-900" dir="ltr">{formatPKR(parseFloat(monthlyAmount))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Yearly (×12)</p>
                    <p className="text-lg font-bold text-emerald-700" dir="ltr">{formatPKR(yearlyAmount)}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={saving || !selectedYear || !monthlyAmount}
              className="w-full h-12 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              data-testid="set-fee-btn"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Calendar className={`w-5 h-5 ${isUrdu ? 'ml-2' : 'mr-2'}`} />
                  Set Fee Configuration
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Fee History */}
      {feeConfigs.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
              Fee Configuration History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {feeConfigs.map((config) => (
                <div 
                  key={config.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    config.is_active ? 'bg-emerald-50' : 'bg-slate-50'
                  } ${isUrdu ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex items-center gap-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      config.is_active ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}>
                      <Calendar className={`w-5 h-5 ${config.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <div className={isUrdu ? 'text-right' : ''}>
                      <p className="font-medium text-slate-900">{config.year}</p>
                      {config.is_active && (
                        <span className="text-xs text-emerald-600 font-medium">Active</span>
                      )}
                    </div>
                  </div>
                  <div className={isUrdu ? 'text-left' : 'text-right'}>
                    <p className="font-bold text-slate-700" dir="ltr">{formatPKR(config.monthly_amount)}/mo</p>
                    <p className="text-xs text-slate-500" dir="ltr">{formatPKR(config.monthly_amount * 12)}/yr</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-0 bg-blue-50">
        <CardContent className="p-4">
          <p className={`text-sm text-blue-700 ${isUrdu ? 'text-right' : ''}`}>
            <strong>Note:</strong> Setting a new fee configuration for a year will deactivate any previous configuration for that year. Only one fee can be active at a time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
