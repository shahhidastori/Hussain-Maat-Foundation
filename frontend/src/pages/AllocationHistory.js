import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { formatPKR, formatDate, getCategoryLabel } from '../lib/utils';
import { 
  History, 
  Search,
  Calendar,
  User,
  HandCoins
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AllocationHistory() {
  const { t, isUrdu } = useLanguage();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    try {
      const response = await axios.get(`${API}/fund-allocations`);
      setAllocations(response.data);
    } catch (error) {
      console.error('Failed to fetch allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAllocations = allocations.filter(allocation => {
    const matchesSearch = 
      allocation.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || allocation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0">{t('approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-0">{t('rejected')}</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 border-0">{t('pending')}</Badge>;
    }
  };

  const getCategoryTranslation = (category) => {
    const translations = {
      school_fee: t('schoolFee'),
      health_expenses: t('healthExpenses'),
      emergency: t('emergency'),
      wedding_support: t('weddingSupport'),
      funeral_expenses: t('funeralExpenses'),
      housing_assistance: t('housingAssistance'),
      business_loan: t('businessLoan'),
      food_assistance: t('foodAssistance'),
      utility_bills: t('utilityBills'),
      medical_surgery: t('medicalSurgery'),
      education_scholarship: t('educationScholarship'),
      other: t('other')
    };
    return translations[category] || getCategoryLabel(category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`} data-testid="allocation-history-page">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          {t('allocationHistoryTitle')}
        </h1>
        <p className="text-slate-500 mt-1">{t('viewAllAllocations')}</p>
      </div>

      {/* Filters */}
      <div className={`flex gap-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 relative">
          <Search className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
          <Input
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${isUrdu ? 'pr-10 text-right' : 'pl-10'} h-11 rounded-xl border-slate-200 bg-white`}
            data-testid="search-allocations"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-11 rounded-xl border-slate-200 bg-white" data-testid="status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="approved">{t('approved')}</SelectItem>
            <SelectItem value="pending">{t('pending')}</SelectItem>
            <SelectItem value="rejected">{t('rejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table View */}
      <Card className="border-0 shadow-sm hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="allocations-table">
              <thead>
                <tr className={`border-b border-slate-100 bg-slate-50 ${isUrdu ? 'text-right' : 'text-left'}`}>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t('caseId')}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t('amountAllocated')}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t('recipientNameCol')}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t('allocationCategory')}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t('allocatedDate')}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t('allocatedBy')}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.length > 0 ? (
                  filteredAllocations.map((allocation) => (
                    <tr 
                      key={allocation.id} 
                      className={`border-b border-slate-50 hover:bg-slate-50 ${isUrdu ? 'text-right' : 'text-left'}`}
                      data-testid={`allocation-row-${allocation.id}`}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-slate-600">
                          {allocation.id?.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-amber-700">
                          {formatPKR(allocation.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{allocation.recipient_name}</p>
                          {allocation.recipient_phone && (
                            <p className="text-xs text-slate-500" dir="ltr">{allocation.recipient_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {getCategoryTranslation(allocation.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {formatDate(allocation.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {allocation.requested_by_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(allocation.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                      {t('noAllocations')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredAllocations.length > 0 ? (
          filteredAllocations.map((allocation) => (
            <Card 
              key={allocation.id} 
              className="border-0 shadow-sm"
              data-testid={`allocation-card-${allocation.id}`}
            >
              <CardContent className="p-4">
                <div className={`flex items-start justify-between mb-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                  <div className={isUrdu ? 'text-right' : ''}>
                    <p className="font-mono text-xs text-slate-500">
                      #{allocation.id?.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="font-semibold text-lg text-amber-700 mt-1">
                      {formatPKR(allocation.amount)}
                    </p>
                  </div>
                  {getStatusBadge(allocation.status)}
                </div>

                <div className={`space-y-2 ${isUrdu ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 text-sm ${isUrdu ? 'flex-row-reverse' : ''}`}>
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{allocation.recipient_name}</span>
                  </div>
                  
                  <div className={`flex items-center gap-2 text-sm ${isUrdu ? 'flex-row-reverse' : ''}`}>
                    <HandCoins className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{getCategoryTranslation(allocation.category)}</span>
                  </div>
                  
                  <div className={`flex items-center gap-2 text-sm ${isUrdu ? 'flex-row-reverse' : ''}`}>
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">{formatDate(allocation.created_at)}</span>
                  </div>
                </div>

                <div className={`mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 ${isUrdu ? 'text-right' : ''}`}>
                  {t('allocatedBy')}: {allocation.requested_by_name}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">{t('noAllocations')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-emerald-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">
              {allocations.filter(a => a.status === 'approved').length}
            </p>
            <p className="text-xs text-emerald-600">{t('approved')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-amber-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">
              {allocations.filter(a => a.status === 'pending').length}
            </p>
            <p className="text-xs text-amber-600">{t('pending')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700">
              {allocations.filter(a => a.status === 'rejected').length}
            </p>
            <p className="text-xs text-red-600">{t('rejected')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
