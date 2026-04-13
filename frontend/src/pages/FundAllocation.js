import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { getCategoryLabel } from '../lib/utils';
import { 
  HandCoins, 
  User,
  Phone,
  GraduationCap,
  Heart,
  AlertTriangle,
  Gift,
  Flower2,
  Home,
  Briefcase,
  UtensilsCrossed,
  Zap,
  Stethoscope,
  BookOpen,
  MoreHorizontal
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryIcons = {
  school_fee: GraduationCap,
  health_expenses: Heart,
  emergency: AlertTriangle,
  wedding_support: Gift,
  funeral_expenses: Flower2,
  housing_assistance: Home,
  business_loan: Briefcase,
  food_assistance: UtensilsCrossed,
  utility_bills: Zap,
  medical_surgery: Stethoscope,
  education_scholarship: BookOpen,
  other: MoreHorizontal
};

const categoryColors = {
  school_fee: 'bg-blue-500',
  health_expenses: 'bg-red-500',
  emergency: 'bg-amber-500',
  wedding_support: 'bg-pink-500',
  funeral_expenses: 'bg-slate-500',
  housing_assistance: 'bg-green-500',
  business_loan: 'bg-purple-500',
  food_assistance: 'bg-orange-500',
  utility_bills: 'bg-yellow-500',
  medical_surgery: 'bg-rose-500',
  education_scholarship: 'bg-indigo-500',
  other: 'bg-gray-500'
};

export default function FundAllocation() {
  const { t, isUrdu } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/fund-categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!recipientName.trim()) {
      toast.error('Please enter recipient name');
      return;
    }
    
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/fund-allocations`, {
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim() || null,
        category: selectedCategory,
        amount: parseFloat(amount),
        description: description.trim()
      });
      
      toast.success(t('allocationCreated'));
      
      // Reset form
      setRecipientName('');
      setRecipientPhone('');
      setSelectedCategory('');
      setAmount('');
      setDescription('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create allocation');
    } finally {
      setLoading(false);
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

  return (
    <div className={`space-y-6 animate-fade-in ${isUrdu ? 'text-right' : ''}`} data-testid="fund-allocation-page">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          {t('fundAllocation')}
        </h1>
        <p className="text-slate-500 mt-1">{t('requestFundAllocation')}</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className={`text-lg flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`} style={{ fontFamily: 'Manrope' }}>
            <HandCoins className="w-5 h-5 text-amber-600" />
            {t('fundAllocationForm')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipient Details Section */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              <h3 className={`font-semibold text-slate-700 flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                <User className="w-4 h-4" />
                {t('recipientDetails')}
              </h3>
              
              <div className="space-y-2">
                <Label className="text-slate-700">{t('recipientName')} *</Label>
                <div className="relative">
                  <User className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                  <Input
                    type="text"
                    placeholder={t('enterRecipientName')}
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className={`${isUrdu ? 'pr-10 text-right' : 'pl-10'} h-11 rounded-xl border-slate-200 bg-white focus:bg-white`}
                    data-testid="recipient-name-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">{t('recipientPhone')}</Label>
                <div className="relative">
                  <Phone className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                  <Input
                    type="tel"
                    placeholder={t('enterRecipientPhone')}
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className={`${isUrdu ? 'pr-10' : 'pl-10'} h-11 rounded-xl border-slate-200 bg-white focus:bg-white`}
                    data-testid="recipient-phone-input"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700">{t('allocationCategory')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map((category) => {
                  const IconComponent = categoryIcons[category] || MoreHorizontal;
                  const colorClass = categoryColors[category] || 'bg-gray-500';
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      data-testid={`category-${category}`}
                      className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${
                        selectedCategory === category
                          ? 'bg-amber-50 border-2 border-amber-300 shadow-sm'
                          : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                      } ${isUrdu ? 'flex-row-reverse text-right' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {getCategoryTranslation(category)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-slate-700">{t('amount')}</Label>
              <div className="relative">
                <span className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-500 font-medium`}>PKR</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${isUrdu ? 'pr-14' : 'pl-14'} h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-lg font-semibold`}
                  min="0"
                  step="100"
                  data-testid="allocation-amount-input"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-slate-700">{t('description')}</Label>
              <Textarea
                placeholder={t('provideDetails')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`min-h-[100px] rounded-xl border-slate-200 bg-slate-50 focus:bg-white resize-none ${isUrdu ? 'text-right' : ''}`}
                data-testid="description-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !recipientName.trim() || !selectedCategory || !amount || !description.trim()}
              className="w-full h-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              data-testid="submit-allocation-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <HandCoins className={`w-5 h-5 ${isUrdu ? 'ml-2' : 'mr-2'}`} />
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
            <strong>{isUrdu ? 'نوٹ:' : 'Note:'}</strong> {t('allocationNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
