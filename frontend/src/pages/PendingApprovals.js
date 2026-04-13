import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { formatPKR, getMonthName, formatDate, getCategoryLabel, getInitials } from '../lib/utils';
import { 
  CheckSquare, 
  Receipt, 
  HandCoins, 
  Check, 
  X, 
  Clock,
  Search,
  CheckCheck,
  XCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PendingApprovals() {
  const { user } = useAuth();
  const { t, isUrdu } = useLanguage();
  const [feeSubmissions, setFeeSubmissions] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fees');
  const [processing, setProcessing] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFees, setSelectedFees] = useState([]);
  const [selectedAllocations, setSelectedAllocations] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      const [feesRes, allocationsRes] = await Promise.all([
        axios.get(`${API}/fee-submissions?status=pending`),
        axios.get(`${API}/fund-allocations?status=pending`)
      ]);
      setFeeSubmissions(feesRes.data);
      setAllocations(allocationsRes.data);
    } catch (error) {
      console.error('Failed to fetch pending items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeAction = async (submissionId, action) => {
    setProcessing(prev => ({ ...prev, [submissionId]: action }));
    try {
      await axios.post(`${API}/fee-submissions/${submissionId}/approve`, {
        action,
        comment: null
      });
      toast.success(`Fee ${action}d successfully`);
      fetchPendingItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setProcessing(prev => ({ ...prev, [submissionId]: null }));
    }
  };

  const handleAllocationAction = async (allocationId, action) => {
    setProcessing(prev => ({ ...prev, [allocationId]: action }));
    try {
      await axios.post(`${API}/fund-allocations/${allocationId}/approve`, {
        action,
        comment: null
      });
      toast.success(`Allocation ${action}d successfully`);
      fetchPendingItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setProcessing(prev => ({ ...prev, [allocationId]: null }));
    }
  };

  const handleBulkFeeAction = async (action) => {
    if (selectedFees.length === 0) return;
    setBulkProcessing(true);
    try {
      await axios.post(`${API}/fee-submissions/bulk-approve`, {
        ids: selectedFees,
        action,
        comment: null
      });
      toast.success(`Bulk ${action} applied to ${selectedFees.length} submissions`);
      setSelectedFees([]);
      fetchPendingItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Bulk ${action} failed`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkAllocationAction = async (action) => {
    if (selectedAllocations.length === 0) return;
    setBulkProcessing(true);
    try {
      await axios.post(`${API}/fund-allocations/bulk-approve`, {
        ids: selectedAllocations,
        action,
        comment: null
      });
      toast.success(`Bulk ${action} applied to ${selectedAllocations.length} allocations`);
      setSelectedAllocations([]);
      fetchPendingItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Bulk ${action} failed`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const hasAlreadyVoted = (item) => item.approvals?.some(a => a.admin_id === user?.id);
  const getVoteStatus = (item) => {
    const myVote = item.approvals?.find(a => a.admin_id === user?.id);
    return myVote ? myVote.action : null;
  };

  const filteredFees = feeSubmissions.filter(s => {
    const search = searchTerm.toLowerCase();
    if (!search) return true;
    return (s.user_name || '').toLowerCase().includes(search) ||
           (s.user_phone || '').includes(search) ||
           (s.submitted_by_name || '').toLowerCase().includes(search);
  });

  const filteredAllocations = allocations.filter(a => {
    const search = searchTerm.toLowerCase();
    if (!search) return true;
    return (a.recipient_name || '').toLowerCase().includes(search) ||
           (a.recipient_phone || '').includes(search) ||
           (a.requested_by_name || '').toLowerCase().includes(search) ||
           (a.category || '').toLowerCase().includes(search);
  });

  const selectableFees = filteredFees.filter(s => !hasAlreadyVoted(s));
  const selectableAllocations = filteredAllocations.filter(a => !hasAlreadyVoted(a));

  const toggleSelectAllFees = () => {
    if (selectedFees.length === selectableFees.length && selectableFees.length > 0) {
      setSelectedFees([]);
    } else {
      setSelectedFees(selectableFees.map(s => s.id));
    }
  };

  const toggleSelectAllAllocations = () => {
    if (selectedAllocations.length === selectableAllocations.length && selectableAllocations.length > 0) {
      setSelectedAllocations([]);
    } else {
      setSelectedAllocations(selectableAllocations.map(a => a.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`} data-testid="pending-approvals-page">
      <div className={`flex items-center justify-between flex-wrap gap-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            {t('pendingApprovalsTitle')}
          </h1>
          <p className="text-slate-500 mt-1">{t('reviewApprove')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
        <Input
          placeholder={t('searchByNamePhone')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${isUrdu ? 'pr-10 text-right' : 'pl-10'} h-11 rounded-xl border-slate-200 bg-white`}
          data-testid="approval-search"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-12 rounded-xl bg-slate-100 p-1">
          <TabsTrigger 
            value="fees" 
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="fees-tab"
          >
            <Receipt className="w-4 h-4 mr-2" />
            {t('fees')} ({feeSubmissions.length})
          </TabsTrigger>
          <TabsTrigger 
            value="allocations" 
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="allocations-tab"
          >
            <HandCoins className="w-4 h-4 mr-2" />
            {t('allocations')} ({allocations.length})
          </TabsTrigger>
        </TabsList>

        {/* Fee Submissions Tab */}
        <TabsContent value="fees" className="mt-4">
          {/* Bulk Actions */}
          {selectedFees.length > 0 && (
            <div className={`flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm font-medium text-blue-700">
                {selectedFees.length} selected
              </span>
              <div className={`flex gap-2 ${isUrdu ? 'mr-auto' : 'ml-auto'}`}>
                <Button
                  size="sm"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkFeeAction('reject')}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white"
                  data-testid="bulk-reject-fees"
                >
                  <XCircle className="w-4 h-4 mr-1" /> {t('reject')}
                </Button>
                <Button
                  size="sm"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkFeeAction('approve')}
                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
                  data-testid="bulk-approve-fees"
                >
                  <CheckCheck className="w-4 h-4 mr-1" /> {t('approve')}
                </Button>
              </div>
            </div>
          )}

          {filteredFees.length > 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="fees-table">
                    <thead>
                      <tr className={`border-b border-slate-100 bg-slate-50 ${isUrdu ? 'text-right' : 'text-left'}`}>
                        <th className="px-3 py-3 w-10">
                          <Checkbox
                            checked={selectedFees.length === selectableFees.length && selectableFees.length > 0}
                            onCheckedChange={toggleSelectAllFees}
                            data-testid="select-all-fees"
                          />
                        </th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600">{t('member')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600">{t('amount')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600 hidden md:table-cell">{t('month')}/{t('year')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600 hidden md:table-cell">{t('by')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600">{t('approvals')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600 text-center">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFees.map((submission) => {
                        const voted = hasAlreadyVoted(submission);
                        const voteStatus = getVoteStatus(submission);
                        const isProcessing = processing[submission.id];
                        const canVote = !voted;
                        const monthsDisplay = !submission.months || submission.months.length === 0
                          ? submission.year
                          : submission.months.length === 12
                          ? `${t('year')} ${submission.year}`
                          : submission.months.map(m => getMonthName(m)?.slice(0, 3)).join(', ') + ` ${submission.year}`;

                        return (
                          <tr key={submission.id} className="border-b border-slate-50 hover:bg-slate-50" data-testid={`fee-row-${submission.id}`}>
                            <td className="px-3 py-3">
                              {canVote && (
                                <Checkbox
                                  checked={selectedFees.includes(submission.id)}
                                  onCheckedChange={() => {
                                    setSelectedFees(prev =>
                                      prev.includes(submission.id) ? prev.filter(id => id !== submission.id) : [...prev, submission.id]
                                    );
                                  }}
                                />
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className={`flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                                <div className="user-avatar text-xs w-8 h-8">
                                  {getInitials(submission.user_name?.split(' ')[0], submission.user_name?.split(' ')[1])}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 text-sm">{submission.user_name}</p>
                                  <p className="text-xs text-slate-500 md:hidden">{monthsDisplay}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-semibold text-emerald-700 text-sm" dir="ltr">{formatPKR(submission.amount)}</span>
                            </td>
                            <td className="px-3 py-3 hidden md:table-cell">
                              <span className="text-sm text-slate-600">{monthsDisplay}</span>
                            </td>
                            <td className="px-3 py-3 hidden md:table-cell">
                              <span className="text-sm text-slate-600">{submission.submitted_by_name}</span>
                            </td>
                            <td className="px-3 py-3">
                              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                                {submission.approvals?.filter(a => a.action === 'approve').length || 0}/2
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              {voted ? (
                                <Badge className={`${voteStatus === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} border-0 text-xs`}>
                                  {voteStatus === 'approve' ? t('approved') : t('rejected')}
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1 justify-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={!!isProcessing}
                                    onClick={() => handleFeeAction(submission.id, 'reject')}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`reject-fee-${submission.id}`}
                                  >
                                    {isProcessing === 'reject' ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={!!isProcessing}
                                    onClick={() => handleFeeAction(submission.id, 'approve')}
                                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    data-testid={`approve-fee-${submission.id}`}
                                  >
                                    {isProcessing === 'approve' ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">{t('noPendingFees')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fund Allocations Tab */}
        <TabsContent value="allocations" className="mt-4">
          {/* Bulk Actions */}
          {selectedAllocations.length > 0 && (
            <div className={`flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm font-medium text-blue-700">
                {selectedAllocations.length} selected
              </span>
              <div className={`flex gap-2 ${isUrdu ? 'mr-auto' : 'ml-auto'}`}>
                <Button
                  size="sm"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkAllocationAction('reject')}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white"
                  data-testid="bulk-reject-allocations"
                >
                  <XCircle className="w-4 h-4 mr-1" /> {t('reject')}
                </Button>
                <Button
                  size="sm"
                  disabled={bulkProcessing}
                  onClick={() => handleBulkAllocationAction('approve')}
                  className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="bulk-approve-allocations"
                >
                  <CheckCheck className="w-4 h-4 mr-1" /> {t('approve')}
                </Button>
              </div>
            </div>
          )}

          {filteredAllocations.length > 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="allocations-table">
                    <thead>
                      <tr className={`border-b border-slate-100 bg-slate-50 ${isUrdu ? 'text-right' : 'text-left'}`}>
                        <th className="px-3 py-3 w-10">
                          <Checkbox
                            checked={selectedAllocations.length === selectableAllocations.length && selectableAllocations.length > 0}
                            onCheckedChange={toggleSelectAllAllocations}
                            data-testid="select-all-allocations"
                          />
                        </th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600">{t('recipientNameCol')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600">{t('amount')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600 hidden md:table-cell">{t('allocationCategory')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600 hidden md:table-cell">{t('requestedBy')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600">{t('approvals')}</th>
                        <th className="px-3 py-3 text-sm font-semibold text-slate-600 text-center">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllocations.map((allocation) => {
                        const voted = hasAlreadyVoted(allocation);
                        const voteStatus = getVoteStatus(allocation);
                        const isProcessing = processing[allocation.id];
                        const canVote = !voted;

                        return (
                          <tr key={allocation.id} className="border-b border-slate-50 hover:bg-slate-50" data-testid={`allocation-row-${allocation.id}`}>
                            <td className="px-3 py-3">
                              {canVote && (
                                <Checkbox
                                  checked={selectedAllocations.includes(allocation.id)}
                                  onCheckedChange={() => {
                                    setSelectedAllocations(prev =>
                                      prev.includes(allocation.id) ? prev.filter(id => id !== allocation.id) : [...prev, allocation.id]
                                    );
                                  }}
                                />
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{allocation.recipient_name}</p>
                                <p className="text-xs text-slate-500 md:hidden">{getCategoryLabel(allocation.category)}</p>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-semibold text-amber-700 text-sm" dir="ltr">{formatPKR(allocation.amount)}</span>
                            </td>
                            <td className="px-3 py-3 hidden md:table-cell">
                              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                                {getCategoryLabel(allocation.category)}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 hidden md:table-cell">
                              <span className="text-sm text-slate-600">{allocation.requested_by_name}</span>
                            </td>
                            <td className="px-3 py-3">
                              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                                {allocation.approvals?.filter(a => a.action === 'approve').length || 0}/2
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              {voted ? (
                                <Badge className={`${voteStatus === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} border-0 text-xs`}>
                                  {voteStatus === 'approve' ? t('approved') : t('rejected')}
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1 justify-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={!!isProcessing}
                                    onClick={() => handleAllocationAction(allocation.id, 'reject')}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`reject-allocation-${allocation.id}`}
                                  >
                                    {isProcessing === 'reject' ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={!!isProcessing}
                                    onClick={() => handleAllocationAction(allocation.id, 'approve')}
                                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    data-testid={`approve-allocation-${allocation.id}`}
                                  >
                                    {isProcessing === 'approve' ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HandCoins className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">{t('noPendingAllocations')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
