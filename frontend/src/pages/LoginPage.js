import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Phone, Lock, Eye, EyeOff, Globe } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_khata-connect-1/artifacts/c9uorwus_hmf_full_logo.svg';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, toggleLanguage, language, isUrdu } = useLanguage();
  const navigate = useNavigate();

  const formatPhoneDisplay = (value) => {
    let cleaned = value.replace(/[^\d+]/g, '');
    
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('92')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        cleaned = '+92' + cleaned.substring(1);
      } else {
        cleaned = '+92' + cleaned;
      }
    }
    
    return cleaned;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneDisplay(e.target.value);
    if (formatted.length <= 13) {
      setPhone(formatted);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setPin(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (phone.length < 13) {
      toast.error('Please enter a valid Pakistani phone number');
      return;
    }
    
    if (pin.length !== 4) {
      toast.error('PIN must be 4 digits');
      return;
    }

    setLoading(true);
    try {
      await login(phone, pin);
      toast.success(t('loginSuccessful'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid phone number or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex flex-col">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="rounded-full bg-white/80 backdrop-blur-sm shadow-sm border-slate-200 hover:bg-white"
          data-testid="language-toggle"
        >
          <Globe className="w-4 h-4 mr-2" />
          {language === 'en' ? 'اردو' : 'English'}
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className={`w-full max-w-md animate-slide-up ${isUrdu ? 'text-right' : ''}`}>
          {/* Logo and Brand */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4 bg-white rounded-2xl p-4 shadow-lg">
              <img 
                src={LOGO_URL} 
                alt="Hussain Maat Foundation" 
                className="h-24 w-auto mx-auto"
                data-testid="login-logo"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-4" style={{ fontFamily: 'Manrope' }}>
              Hussain Maat Foundation
            </h1>
            <p className="text-slate-500 text-sm mt-1">Fund Management System</p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-500" />
            <CardContent className="p-8">
              <div className={`text-center mb-6 ${isUrdu ? 'text-right' : ''}`}>
                <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Manrope' }}>
                  {t('welcomeBack')}
                </h2>
                <p className="text-slate-500 mt-1 text-sm">{t('enterPhonePin')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700 font-medium">
                    {t('phoneNumber')}
                  </Label>
                  <div className="relative">
                    <Phone className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600`} />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+92 3XX XXXXXXX"
                      value={phone}
                      onChange={handlePhoneChange}
                      className={`${isUrdu ? 'pr-10 text-right' : 'pl-10'} h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 text-lg`}
                      data-testid="phone-input"
                      dir="ltr"
                    />
                  </div>
                  <p className={`text-xs text-slate-500 ${isUrdu ? 'text-right' : ''}`}>{t('pakistaniOnly')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pin" className="text-slate-700 font-medium">
                    {t('pin')}
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600`} />
                    <Input
                      id="pin"
                      type={showPin ? 'text' : 'password'}
                      placeholder="••••"
                      value={pin}
                      onChange={handlePinChange}
                      className={`${isUrdu ? 'pr-10' : 'pl-10'} pr-12 h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 text-center tracking-[0.75em] text-2xl font-bold`}
                      maxLength={4}
                      data-testid="pin-input"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold text-lg shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300 mt-4"
                  data-testid="login-btn"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    t('login')
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-slate-600">
                  {t('dontHaveAccount')}{' '}
                  <Link 
                    to="/signup" 
                    className="text-emerald-600 font-semibold hover:text-emerald-700 hover:underline"
                    data-testid="signup-link"
                  >
                    {t('signUp')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
