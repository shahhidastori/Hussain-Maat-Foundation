import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';
import { getInitials } from '../lib/utils';
import { 
  Users, 
  Search, 
  Shield, 
  ShieldCheck, 
  User,
  Phone,
  Crown,
  Plus,
  Edit,
  Trash2,
  Ban,
  CheckCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function UserManagement() {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const { t, isUrdu } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [processing, setProcessing] = useState(false);
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  
  // Form states
  const [editingUser, setEditingUser] = useState(null);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newFirstName.trim() || !newLastName.trim()) {
      toast.error('Please enter first and last name');
      return;
    }

    setProcessing(true);
    try {
      await axios.post(`${API}/users/add-member`, {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        phone: newPhone.trim() || null
      });
      
      toast.success(t('memberAdded'));
      resetForm();
      setShowAddDialog(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add member');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    if (!newFirstName.trim() || !newLastName.trim()) {
      toast.error('Please enter first and last name');
      return;
    }

    setProcessing(true);
    try {
      await axios.put(`${API}/users/${editingUser.id}`, {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        phone: newPhone.trim() || null
      });
      
      toast.success('User updated successfully');
      resetForm();
      setShowEditDialog(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;

    setProcessing(true);
    try {
      await axios.delete(`${API}/users/${editingUser.id}`);
      toast.success('User deleted successfully');
      setShowDeleteDialog(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await axios.post(`${API}/users/${userId}/toggle-status`);
      toast.success(currentStatus ? 'User disabled' : 'User enabled');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handlePromote = async () => {
    if (!editingUser) return;

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/users/promote`, {
        user_id: editingUser.id
      });
      
      toast.success(`User role changed to ${response.data.new_role}`);
      setShowRoleDialog(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change user role');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setProcessing(true);
    try {
      await axios.post(`${API}/users/bulk-action`, {
        user_ids: selectedUsers,
        action: action
      });
      toast.success(`${action} applied to ${selectedUsers.length} users`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} users`);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const toggleSelectAll = () => {
    const selectableUsers = filteredUsers.filter(u => u.role !== 'super_admin' && u.id !== currentUser?.id);
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map(u => u.id));
    }
  };

  const resetForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewPhone('');
    setEditingUser(null);
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setNewFirstName(user.first_name);
    setNewLastName(user.last_name);
    setNewPhone(user.phone || '');
    setShowEditDialog(true);
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || phone.includes(search);
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className={`bg-purple-100 text-purple-700 border-0 ${isUrdu ? 'flex-row-reverse' : ''}`}>
            <Crown className={`w-3 h-3 ${isUrdu ? 'ml-1' : 'mr-1'}`} />
            {t('superAdmin')}
          </Badge>
        );
      case 'admin':
        return (
          <Badge className={`bg-blue-100 text-blue-700 border-0 ${isUrdu ? 'flex-row-reverse' : ''}`}>
            <ShieldCheck className={`w-3 h-3 ${isUrdu ? 'ml-1' : 'mr-1'}`} />
            {t('admin')}
          </Badge>
        );
      default:
        return (
          <Badge className={`bg-slate-100 text-slate-600 border-0 ${isUrdu ? 'flex-row-reverse' : ''}`}>
            <User className={`w-3 h-3 ${isUrdu ? 'ml-1' : 'mr-1'}`} />
            {t('member')}
          </Badge>
        );
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
    <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`} data-testid="user-management-page">
      <div className={`flex items-center justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            {t('userManagement')}
          </h1>
          <p className="text-slate-500 mt-1">{t('manageMembersRoles')}</p>
        </div>
        {isSuperAdmin() && (
          <Button
            onClick={() => { resetForm(); setShowAddDialog(true); }}
            className={`rounded-xl bg-emerald-700 hover:bg-emerald-800 ${isUrdu ? 'flex-row-reverse' : ''}`}
            data-testid="add-member-btn"
          >
            <Plus className={`w-4 h-4 ${isUrdu ? 'ml-2' : 'mr-2'}`} />
            {t('addMember')}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {users.filter(u => u.role === 'member').length}
            </p>
            <p className="text-xs text-slate-500">{t('members')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-xs text-slate-500">{t('admins')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'super_admin').length}
            </p>
            <p className="text-xs text-slate-500">{t('superAdmin')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Bulk Actions */}
      <div className={`flex gap-3 flex-wrap ${isUrdu ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-[200px] relative">
          <Search className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
          <Input
            placeholder={t('searchByNamePhone')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${isUrdu ? 'pr-10 text-right' : 'pl-10'} h-11 rounded-xl border-slate-200 bg-white`}
            data-testid="user-search"
          />
        </div>
        
        {/* Bulk Actions */}
        {isSuperAdmin() && selectedUsers.length > 0 && (
          <div className={`flex gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('disable')}
              className="rounded-lg border-amber-200 text-amber-600 hover:bg-amber-50"
            >
              <Ban className="w-4 h-4 mr-1" />
              Disable ({selectedUsers.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('delete')}
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete ({selectedUsers.length})
            </Button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="users-table">
              <thead>
                <tr className={`border-b border-slate-100 bg-slate-50 ${isUrdu ? 'text-right' : 'text-left'}`}>
                  {isSuperAdmin() && (
                    <th className="px-4 py-3 w-10">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.filter(u => u.role !== 'super_admin' && u.id !== currentUser?.id).length && selectedUsers.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="select-all-users"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Phone</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Role</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                  {isSuperAdmin() && (
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-center">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const canModify = user.role !== 'super_admin' && user.id !== currentUser?.id;
                  return (
                    <tr 
                      key={user.id} 
                      className={`border-b border-slate-50 hover:bg-slate-50 ${user.is_disabled ? 'opacity-50' : ''}`}
                      data-testid={`user-row-${user.id}`}
                    >
                      {isSuperAdmin() && (
                        <td className="px-4 py-3">
                          {canModify && (
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() => toggleSelectUser(user.id)}
                            />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                          <div className="user-avatar text-sm">
                            {getInitials(user.first_name, user.last_name)}
                          </div>
                          <span className="font-medium text-slate-900">
                            {user.first_name} {user.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-600" dir="ltr">{user.phone || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={user.is_disabled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                          {user.is_disabled ? 'Disabled' : 'Active'}
                        </Badge>
                      </td>
                      {isSuperAdmin() && (
                        <td className="px-4 py-3">
                          {canModify && (
                            <div className={`flex items-center gap-1 justify-center ${isUrdu ? 'flex-row-reverse' : ''}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingUser(user); setShowRoleDialog(true); }}
                                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title={user.role === 'admin' ? 'Make Member' : 'Make Admin'}
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(user.id, !user.is_disabled)}
                                className={`h-8 w-8 p-0 ${user.is_disabled ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'}`}
                                title={user.is_disabled ? 'Enable' : 'Disable'}
                              >
                                {user.is_disabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingUser(user); setShowDeleteDialog(true); }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredUsers.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">{t('noUsersFound')}</p>
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>{t('addNewMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('firstName')} *</Label>
                <Input
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder={t('firstName')}
                  className="rounded-xl"
                  data-testid="new-member-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('lastName')} *</Label>
                <Input
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder={t('lastName')}
                  className="rounded-xl"
                  data-testid="new-member-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('phoneOptional')}</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+92 3XX XXXXXXX"
                className="rounded-xl"
                data-testid="new-member-phone"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={processing || !newFirstName.trim() || !newLastName.trim()}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800"
              data-testid="confirm-add-member"
            >
              {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('addMember')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('firstName')} *</Label>
                <Input
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('lastName')} *</Label>
                <Input
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('phoneOptional')}</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+92 3XX XXXXXXX"
                className="rounded-xl"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={processing || !newFirstName.trim() || !newLastName.trim()}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800"
            >
              {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {editingUser?.first_name} {editingUser?.last_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={processing}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>{t('changeUserRole')}</DialogTitle>
            <DialogDescription>
              Change {editingUser?.first_name} {editingUser?.last_name} from {editingUser?.role} to {editingUser?.role === 'admin' ? 'member' : 'admin'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRoleDialog(false)} className="rounded-xl">
              {t('cancel')}
            </Button>
            <Button
              onClick={handlePromote}
              disabled={processing}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800"
            >
              {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('confirmChange')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
