import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatPKR, getMonthName, formatDate } from '../lib/utils';
import { 
  Wallet, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  PiggyBank,
  Receipt,
  HandCoins
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MemberDashboard() {
  const { user } = useAuth();
  const { t, isUrdu } = useLanguage();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/member`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loader"></div>
      </div>
    );
  }

  const stats = [
    {
      label: t('totalPaidFee'),
      value: dashboard?.total_paid_fee || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      label: t('fundCollection'),
      value: dashboard?.total_collection || 0,
      icon: PiggyBank,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: t('totalExpense'),
      value: dashboard?.total_expense || 0,
      icon: HandCoins,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: t('fundBalance'),
      value: dashboard?.total_remaining || 0,
      icon: Wallet,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100'
    }
  ];

  return (
    <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`} data-testid="member-dashboard">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          {t('welcome')}, {user?.first_name}!
        </h1>
        <p className="text-slate-500 mt-1">{t('feeStatusOverview')}</p>
      </div>

      {/* Hero Stat Card */}
      <Card className="stat-card-hero overflow-hidden" data-testid="pending-fee-card">
        <CardContent className="p-6">
          <div className={`flex items-start justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
            <div className={isUrdu ? 'text-right' : ''}>
              <p className="stat-label text-emerald-100 font-medium">{t('totalPendingFee')}</p>
              <p className="stat-value text-4xl font-bold mt-2" dir="ltr">{formatPKR(dashboard?.total_pending_fee || 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          {dashboard?.total_pending_fee > 0 && (
            <p className="text-emerald-100 text-sm mt-4">
              {t('clearPendingDues')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <Card 
            key={stat.label} 
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
            data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
              <p className="text-lg font-bold text-slate-900 mt-1" dir="ltr">{formatPKR(stat.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Month-wise Paid Fees */}
      {dashboard?.month_wise_paid && Object.keys(dashboard.month_wise_paid).length > 0 && (
        <Card className="border-0 shadow-sm" data-testid="paid-fees-section">
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {t('paidMonths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dashboard.month_wise_paid)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([monthKey, amount]) => {
                  const [year, month] = monthKey.split('-');
                  return (
                    <div 
                      key={monthKey}
                      className={`flex items-center justify-between p-3 bg-emerald-50 rounded-xl ${isUrdu ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className={isUrdu ? 'text-right' : ''}>
                          <p className="font-medium text-slate-900">
                            {getMonthName(parseInt(month))} {year}
                          </p>
                          <p className="text-xs text-emerald-600">{t('paid')}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-emerald-700" dir="ltr">{formatPKR(amount)}</p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month-wise Pending Fees */}
      {dashboard?.month_wise_pending && Object.keys(dashboard.month_wise_pending).length > 0 && (
        <Card className="border-0 shadow-sm" data-testid="pending-fees-section">
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
              <AlertCircle className="w-5 h-5 text-amber-600" />
              {t('pendingMonths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dashboard.month_wise_pending)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([monthKey, amount]) => {
                  const [year, month] = monthKey.split('-');
                  return (
                    <div 
                      key={monthKey}
                      className={`flex items-center justify-between p-3 bg-amber-50 rounded-xl ${isUrdu ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className={isUrdu ? 'text-right' : ''}>
                          <p className="font-medium text-slate-900">
                            {getMonthName(parseInt(month))} {year}
                          </p>
                          <p className="text-xs text-amber-600">{t('pending')}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-amber-700" dir="ltr">{formatPKR(amount)}</p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Submissions */}
      {dashboard?.pending_submissions?.length > 0 && (
        <Card className="border-0 shadow-sm" data-testid="pending-submissions-section">
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
              <Clock className="w-5 h-5 text-blue-600" />
              {t('pendingApproval')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.pending_submissions.map((submission) => (
                <div 
                  key={submission.id}
                  className={`flex items-center justify-between p-3 bg-blue-50 rounded-xl ${isUrdu ? 'flex-row-reverse' : ''}`}
                >
                  <div className={isUrdu ? 'text-right' : ''}>
                    <p className="font-medium text-slate-900">
                      {getMonthName(submission.month)} {submission.year}
                    </p>
                    <p className="text-xs text-blue-600">{t('awaitingApproval')}</p>
                  </div>
                  <div className={isUrdu ? 'text-left' : 'text-right'}>
                    <p className="font-semibold text-blue-700" dir="ltr">{formatPKR(submission.amount)}</p>
                    <Badge className="mt-1 bg-blue-100 text-blue-700 border-0">
                      {submission.approvals?.length || 0}/2 {t('approvalProgress')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
