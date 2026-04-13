import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { formatPKR, getMonthName, getInitials } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  HandCoins,
  Users,
  ArrowRight,
  Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#047857', '#b45309', '#2563eb', '#7c3aed', '#dc2626', '#0891b2', '#ca8a04', '#16a34a', '#e11d48', '#6366f1', '#ea580c', '#64748b'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, isUrdu } = useLanguage();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchAnalytics();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/admin`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loader"></div>
      </div>
    );
  }

  const quickActions = [
    { label: t('collectFee'), icon: Receipt, path: '/fee-submission', color: 'bg-emerald-600' },
    { label: t('allocateFunds'), icon: HandCoins, path: '/fund-allocation', color: 'bg-amber-600' },
    { label: t('setMonthlyFee'), icon: Calendar, path: '/monthly-fees', color: 'bg-blue-600' },
    { label: t('manageUsers'), icon: Users, path: '/users', color: 'bg-purple-600' },
  ];

  return (
    <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`} data-testid="admin-dashboard">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          {t('adminDashboard')}
        </h1>
        <p className="text-slate-500 mt-1">{t('fundOverview')}</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Collection */}
        <Card className="stat-card-hero col-span-1" data-testid="total-collection-card">
          <CardContent className="p-5">
            <div className={`flex items-start justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <div className={isUrdu ? 'text-right' : ''}>
                <p className="text-emerald-100 font-medium text-sm">{t('totalCollection')}</p>
                <p className="text-3xl font-bold text-white mt-1" dir="ltr">
                  {formatPKR(dashboard?.total_collection || 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expense */}
        <Card className="stat-card" data-testid="total-expense-card">
          <CardContent className="p-5">
            <div className={`flex items-start justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <div className={isUrdu ? 'text-right' : ''}>
                <p className="text-slate-500 font-medium text-sm">{t('totalExpense')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1" dir="ltr">
                  {formatPKR(dashboard?.total_expense || 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Balance */}
        <Card className="stat-card" data-testid="remaining-balance-card">
          <CardContent className="p-5">
            <div className={`flex items-start justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <div className={isUrdu ? 'text-right' : ''}>
                <p className="text-slate-500 font-medium text-sm">{t('remainingBalance')}</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1" dir="ltr">
                  {formatPKR(dashboard?.total_remaining || 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="stat-card" data-testid="pending-fees-stat">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">{t('pendingFeeSubmissions')}</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {dashboard?.pending_fee_submissions || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="stat-card" data-testid="pending-allocations-stat">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">{t('pendingAllocations')}</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {dashboard?.pending_allocations || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="stat-card" data-testid="total-pending-stat">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">{t('totalPendingDues')}</p>
            <p className="text-xl font-bold text-red-600 mt-1" dir="ltr">
              {formatPKR(dashboard?.total_pending || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="stat-card" data-testid="total-members-stat">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">{t('totalMembers')}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {dashboard?.total_members || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm" data-testid="quick-actions">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
            {t('quickActions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-slate-50 border-slate-200"
                onClick={() => navigate(action.path)}
                data-testid={`action-${action.path.replace('/', '')}`}
              >
                <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Members with Pending Dues */}
      {dashboard?.users_with_pending && Object.keys(dashboard.users_with_pending).length > 0 && (
        <Card className="border-0 shadow-sm" data-testid="users-with-pending">
          <CardHeader className="pb-3">
            <div className={`flex items-center justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
                {t('membersWithPendingDues')}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/fee-submission')}
                className={`text-emerald-600 hover:text-emerald-700 ${isUrdu ? 'flex-row-reverse' : ''}`}
              >
                {t('collectFee')} <ArrowRight className={`w-4 h-4 ${isUrdu ? 'mr-1' : 'ml-1'}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {Object.entries(dashboard.users_with_pending).map(([userId, userData]) => (
                <div 
                  key={userId}
                  className={`flex items-center justify-between p-3 bg-amber-50 rounded-xl ${isUrdu ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex items-center gap-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                    <div className="user-avatar text-sm">
                      {getInitials(userData.name.split(' ')[0], userData.name.split(' ')[1])}
                    </div>
                    <div className={isUrdu ? 'text-right' : ''}>
                      <p className="font-medium text-slate-900">{userData.name}</p>
                      <p className="text-xs text-slate-500" dir="ltr">{userData.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-amber-700" dir="ltr">{formatPKR(userData.pending_amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Submissions */}
        <Card className="border-0 shadow-sm" data-testid="recent-submissions">
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
              <Receipt className="w-5 h-5 text-emerald-600" />
              {t('recentSubmissions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {dashboard?.recent_submissions?.length > 0 ? (
                dashboard.recent_submissions.slice(0, 5).map((submission) => (
                  <div
                    key={submission.id}
                    className={`flex items-center justify-between p-3 bg-slate-50 rounded-xl ${isUrdu ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={isUrdu ? 'text-right' : ''}>
                      <p className="font-medium text-slate-900 text-sm">{submission.user_name}</p>
                      <p className="text-xs text-slate-500">
                        {getMonthName(submission.month)} {submission.year}
                      </p>
                    </div>
                    <div className={isUrdu ? 'text-left' : 'text-right'}>
                      <p className="font-semibold text-slate-700 text-sm" dir="ltr">{formatPKR(submission.amount)}</p>
                      <Badge className={`text-xs ${
                        submission.status === 'approved' ? 'status-approved' :
                        submission.status === 'rejected' ? 'status-rejected' :
                        'status-pending'
                      } border`}>
                        {submission.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">{t('noSubmissionsYet')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Allocations */}
        <Card className="border-0 shadow-sm" data-testid="recent-allocations">
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
              <HandCoins className="w-5 h-5 text-amber-600" />
              {t('recentAllocations')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {dashboard?.recent_allocations?.length > 0 ? (
                dashboard.recent_allocations.slice(0, 5).map((allocation) => (
                  <div
                    key={allocation.id}
                    className={`flex items-center justify-between p-3 bg-slate-50 rounded-xl ${isUrdu ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={isUrdu ? 'text-right' : ''}>
                      <p className="font-medium text-slate-900 text-sm">{allocation.recipient_name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {allocation.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className={isUrdu ? 'text-left' : 'text-right'}>
                      <p className="font-semibold text-slate-700 text-sm" dir="ltr">{formatPKR(allocation.amount)}</p>
                      <Badge className={`text-xs ${
                        allocation.status === 'approved' ? 'status-approved' :
                        allocation.status === 'rejected' ? 'status-rejected' :
                        'status-pending'
                      } border`}>
                        {allocation.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">{t('noAllocationsYet')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      {!analyticsLoading && analytics && (
        <div>
          <h2 className={`text-xl font-bold text-slate-900 mb-4 ${isUrdu ? 'text-right' : ''}`} style={{ fontFamily: 'Manrope' }}>
            {t('analyticsTitle') || 'Analytics'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Collection vs Expense Bar Chart */}
            {analytics?.monthly_collections && Object.keys(analytics.monthly_collections).length > 0 ? (
              <Card className="border-0 shadow-sm" data-testid="monthly-trends-chart">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
                    {t('monthlyTrends') || 'Monthly Trends'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(analytics.monthly_collections).map(([month, amount]) => ({
                        month: month.slice(5),
                        collections: amount,
                        expenses: analytics.monthly_expenses?.[month] || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => formatPKR(value)}
                        labelStyle={{ color: '#1e293b' }}
                      />
                      <Bar dataKey="collections" fill="#047857" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expenses" fill="#dc2626" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
                    {t('monthlyTrends') || 'Monthly Trends'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-500 text-center py-12">{t('noDataAvailable') || 'No data available'}</p>
                </CardContent>
              </Card>
            )}

            {/* Category Breakdown Pie Chart */}
            {analytics?.category_breakdown && Object.keys(analytics.category_breakdown).length > 0 ? (
              <Card className="border-0 shadow-sm" data-testid="category-breakdown-chart">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
                    {t('allocationByCategory') || 'Allocation by Category'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics.category_breakdown).map(([category, amount]) => ({
                          name: category.replace(/_/g, ' '),
                          value: amount,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(analytics.category_breakdown).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatPKR(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
                    {t('allocationByCategory') || 'Allocation by Category'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-500 text-center py-12">{t('noDataAvailable') || 'No data available'}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
