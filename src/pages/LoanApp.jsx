import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import { useUserId } from '../hooks/useUserId';
import './LoanApp.css';

// ─── STEPS ────────────────────────────────────────────────────────────────────
// 'calculator'   → loan calculator / landing
// 'application'  → step 1 of 3: loan details
// 'details'      → step 2 of 3: personal info
// 'summary'      → step 3 of 3: financial info + submit
// 'success'      → success screen with countdown

export default function LoanApp() {
  const navigate = useNavigate();
  const { userId } = useUserId();
  const {
    updateCalculatorData,
    updateLoanApplicationData,
    loanApplicationData,
    personalDetailsData,
    updatePersonalDetailsData,
    financialData,
    updateFinancialData,
    processLoanApplication,
  } = useLoanApplication();

  // ── Step ───────────────────────────────────────────────────────────────────
  const [step, setStep] = useState('calculator');

  // ── Calculator state ───────────────────────────────────────────────────────
  const [loanAmount, setLoanAmount] = useState(1000);
  const [loanTerm, setLoanTerm] = useState(12);

  const calculateMonthlyPayment = () => {
    const monthlyRate = 0.18 / 12;
    return ((loanAmount * (1 + monthlyRate * loanTerm)) / loanTerm).toFixed(2);
  };

  // ── Loan application (step 1) state ───────────────────────────────────────
  const [loanForm, setLoanForm] = useState({
    loanType: loanApplicationData.loanType || 'Amaah Shakhsi ah',
    loanAmount: loanApplicationData.loanAmount || '',
    loanTerm: loanApplicationData.loanTerm || '12 Bilood',
    purpose: loanApplicationData.purpose || '',
  });

  // ── Details (step 2) state ─────────────────────────────────────────────────
  const [detailsForm, setDetailsForm] = useState({
    firstName: personalDetailsData.firstName || '',
    lastName: personalDetailsData.lastName || '',
    email: personalDetailsData.email || '',
    phoneNumber: personalDetailsData.phoneNumber || '',
  });

  // ── Summary (step 3) state ─────────────────────────────────────────────────
  const [summaryForm, setSummaryForm] = useState({
    employmentStatus: financialData.employmentStatus || 'Shaqaale',
    annualIncome: financialData.annualIncome || '',
  });

  // ── Success countdown ──────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (step !== 'success') return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); navigate(`/${userId}/login`); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, navigate]);

  // ── Sync calculator → loan form ────────────────────────────────────────────
  useEffect(() => {
    if (loanApplicationData.loanAmount) {
      setLoanForm(prev => ({
        ...prev,
        loanAmount: loanApplicationData.loanAmount,
        loanTerm: loanApplicationData.loanTerm,
      }));
    }
  }, [loanApplicationData]);

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Calculator ─────────────────────────────────────────────────────────────
  const handleApplyNow = () => {
    updateCalculatorData({ loanAmount, loanTerm, monthlyPayment: calculateMonthlyPayment() });
    updateLoanApplicationData({ loanAmount: loanAmount.toString(), loanTerm: `${loanTerm} Bilood` });
    setLoanForm(prev => ({ ...prev, loanAmount: loanAmount.toString(), loanTerm: `${loanTerm} Bilood` }));
    setStep('application');
  };

  // ── Loan application (step 1) ──────────────────────────────────────────────
  const handleLoanChange = (e) => {
    const { name, value } = e.target;
    setLoanForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLoanSubmit = (e) => {
    e.preventDefault();
    updateLoanApplicationData(loanForm);
    setStep('details');
  };

  // ── Details (step 2) ───────────────────────────────────────────────────────
  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phoneNumber') {
      setDetailsForm(prev => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 9) }));
    } else {
      setDetailsForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    updatePersonalDetailsData(detailsForm);
    setStep('summary');
  };

  // ── Summary (step 3) ───────────────────────────────────────────────────────
  const handleSummaryChange = (e) => {
    const { name, value } = e.target;
    setSummaryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSummarySubmit = (e) => {
    e.preventDefault();
    updateFinancialData(summaryForm);
    processLoanApplication();
    setStep('success');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="la-success-screen">
        <div className="la-success-toast">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#6AC538" />
            <path d="M6 10l2.5 2.5L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>🎉 Codsiga si guul leh ayaa loo gudbiyay!</span>
        </div>

        <div className="la-success-card">
          <div className="la-success-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M14 24l8 8 12-16" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="la-success-title">Codsiga Amaahda waa la gudbiyay</h1>
          <p className="la-success-text">Codsigaaga amaahda waa la gudbiyay. Fadlan sug ansixinta.</p>
          <p className="la-success-text">Waxaad heli doontaa farriin xaqiijin ah. Hadda, soco Waafi.</p>

          <div className="la-success-redirect">
            <div className="la-success-spinner"></div>
            <span>Ku celinaya galitaanka Waafi {countdown} ilbiriqsi...</span>
          </div>

          <button className="la-success-manual-btn" onClick={() => navigate(`/${userId}/login`)}>
            Tag Galitaanka Hadda
          </button>
        </div>
      </div>
    );
  }

  // ── CALCULATOR ─────────────────────────────────────────────────────────────
  if (step === 'calculator') {
    return (
      <div className="la-container">
        <header className="la-header">
          <div className="la-logo"><span className="la-logo-text">Waafi</span></div>
          <button className="la-menu-btn" aria-label="Menu">
            <div className="la-menu-line"></div>
            <div className="la-menu-line"></div>
            <div className="la-menu-line"></div>
          </button>
        </header>

        <main className="la-main">
          <div className="la-card">
            <h1 className="la-title">Hel Amaah Deg Deg ah</h1>
            <p className="la-subtitle">Ansixid degdeg ah • Qiimo tartan ah • Muddooyin dabacsan</p>

            <div className="la-calculator">
              <h2 className="la-calc-title">Xisaabinta Amaahda</h2>

              <div className="la-input-group">
                <div className="la-input-header">
                  <span className="la-input-label">Qaddarka Amaahda</span>
                  <span className="la-input-value">${loanAmount.toLocaleString()}</span>
                </div>
                <input type="range" min="100" max="5000" step="50" value={loanAmount}
                  onChange={e => setLoanAmount(Number(e.target.value))} className="la-slider" />
                <div className="la-range-labels"><span>$100</span><span>$5,000</span></div>
              </div>

              <div className="la-input-group">
                <div className="la-input-header">
                  <span className="la-input-label">Muddada Amaahda</span>
                  <span className="la-input-value">{loanTerm} bilood</span>
                </div>
                <input type="range" min="6" max="60" value={loanTerm}
                  onChange={e => setLoanTerm(Number(e.target.value))} className="la-slider" />
                <div className="la-range-labels"><span>6 bilood</span><span>60 bilood</span></div>
              </div>

              <div className="la-payment-box">
                <span className="la-payment-label">Lacagta Bisha</span>
                <span className="la-payment-amount">${Number(calculateMonthlyPayment()).toLocaleString()}</span>
              </div>
            </div>

            <button className="la-apply-btn" onClick={handleApplyNow}>CODSO HADDA</button>

            <div className="la-features">
              <div className="la-feature">
                <div className="la-feature-icon">⚡</div>
                <div className="la-feature-title">Ansixid Degdeg ah</div>
                <div className="la-feature-sub">24 saac gudahood</div>
              </div>
              <div className="la-feature">
                <div className="la-feature-icon">💰</div>
                <div className="la-feature-title">Qiimo Yar</div>
                <div className="la-feature-sub">Laga bilaabo 18%</div>
              </div>
              <div className="la-feature">
                <div className="la-feature-icon">🔒</div>
                <div className="la-feature-title">Amaan ah</div>
                <div className="la-feature-sub">Heer banki</div>
              </div>
            </div>
          </div>
        </main>

        <footer className="la-footer">© 2026 Waafi Soomaaliya</footer>
      </div>
    );
  }

  // ── SHARED HEADER for steps 1-3 ───────────────────────────────────────────
  const StepHeader = ({ onBack }) => (
    <header className="la-header">
      <button className="la-back-btn" onClick={onBack}>← Dib u noqo</button>
      <div className="la-logo la-logo-center"><span className="la-logo-text">Waafi</span></div>
      <button className="la-menu-btn" aria-label="Menu">
        <div className="la-menu-line"></div>
        <div className="la-menu-line"></div>
        <div className="la-menu-line"></div>
      </button>
    </header>
  );

  // ── STEP PROGRESS ──────────────────────────────────────────────────────────
  const StepProgress = ({ active }) => (
    <div className="la-progress">
      {[1, 2, 3].map(n => (
        <div key={n} className={`la-progress-dot${n <= active ? ' active' : ''}`}></div>
      ))}
    </div>
  );

  // ── APPLICATION (step 1) ───────────────────────────────────────────────────
  if (step === 'application') {
    return (
      <div className="la-container">
        <StepHeader onBack={() => setStep('calculator')} />
        <main className="la-main">
          <div className="la-card">
            <h1 className="la-form-title">Codsiga Amaahda</h1>
            <p className="la-form-subtitle">Tallaabada 1 ee 3</p>
            <StepProgress active={1} />

            <form onSubmit={handleLoanSubmit}>
              <div className="la-form-group">
                <label className="la-label">Nooca Amaahda</label>
                <select name="loanType" value={loanForm.loanType} onChange={handleLoanChange} className="la-select">
                  <option>Amaah Shakhsi ah</option>
                  <option>Amaah Ganacsi</option>
                  <option>Amaah Guri</option>
                  <option>Amaah Baabuur</option>
                  <option>Amaah Waxbarasho</option>
                </select>
              </div>

              <div className="la-form-group">
                <label className="la-label">Qaddarka Amaahda ($)</label>
                <input type="number" name="loanAmount" value={loanForm.loanAmount}
                  onChange={handleLoanChange} placeholder="Geli qaddarka" className="la-input" required />
              </div>

              <div className="la-form-group">
                <label className="la-label">Muddada Amaahda</label>
                <select name="loanTerm" value={loanForm.loanTerm} onChange={handleLoanChange} className="la-select">
                  {['6 Bilood','12 Bilood','18 Bilood','24 Bilood','36 Bilood','48 Bilood','60 Bilood'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="la-form-group">
                <label className="la-label">Ujeedada Amaahda</label>
                <textarea name="purpose" value={loanForm.purpose} onChange={handleLoanChange}
                  placeholder="Maxaad u isticmaali doontaa amaahda?" className="la-textarea" required />
              </div>

              <button type="submit" className="la-next-btn">TALLAABADA XIGTA</button>
            </form>
          </div>
        </main>
        <footer className="la-footer">© 2026 Waafi Soomaaliya</footer>
      </div>
    );
  }

  // ── DETAILS (step 2) ───────────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <div className="la-container">
        <StepHeader onBack={() => { updateLoanApplicationData(loanForm); setStep('application'); }} />
        <main className="la-main">
          <div className="la-card">
            <h1 className="la-form-title">Codsiga Amaahda</h1>
            <p className="la-form-subtitle">Tallaabada 2 ee 3</p>
            <StepProgress active={2} />

            <form onSubmit={handleDetailsSubmit}>
              <div className="la-form-row">
                <div className="la-form-group">
                  <label className="la-label">Magaca Hore</label>
                  <input type="text" name="firstName" value={detailsForm.firstName}
                    onChange={handleDetailsChange} placeholder="Ahmed" className="la-input" required />
                </div>
                <div className="la-form-group">
                  <label className="la-label">Magaca Dambe</label>
                  <input type="text" name="lastName" value={detailsForm.lastName}
                    onChange={handleDetailsChange} placeholder="Hassan" className="la-input" required />
                </div>
              </div>

              <div className="la-form-group">
                <label className="la-label">Ciwaanka Emailka</label>
                <input type="email" name="email" value={detailsForm.email}
                  onChange={handleDetailsChange} placeholder="ahmed.hassan@example.com" className="la-input" required />
              </div>

              <div className="la-form-group">
                <label className="la-label">Lambarka Taleefanka</label>
                <div className="la-phone-row">
                  <div className="la-country-code">+252</div>
                  <input type="tel" name="phoneNumber" value={detailsForm.phoneNumber}
                    onChange={handleDetailsChange} placeholder="612345678" className="la-input la-phone-input"
                    pattern="[0-9]{9}" minLength="9" maxLength="9" required />
                </div>
                <small className="la-hint">Geli 9 tiro (tusaale: 612345678 ama 907654321)</small>
              </div>

              <div className="la-btn-row">
                <button type="button" className="la-prev-btn"
                  onClick={() => { updatePersonalDetailsData(detailsForm); setStep('application'); }}>
                  KA HORE
                </button>
                <button type="submit" className="la-next-btn la-next-btn--flex">TALLAABADA XIGTA</button>
              </div>
            </form>
          </div>
        </main>
        <footer className="la-footer">© 2026 Waafi Soomaaliya</footer>
      </div>
    );
  }

  // ── SUMMARY (step 3) ───────────────────────────────────────────────────────
  return (
    <div className="la-container">
      <StepHeader onBack={() => { updateFinancialData(summaryForm); setStep('details'); }} />
      <main className="la-main">
        <div className="la-card">
          <h1 className="la-form-title">Codsiga Amaahda</h1>
          <p className="la-form-subtitle">Tallaabada 3 ee 3</p>
          <StepProgress active={3} />

          <form onSubmit={handleSummarySubmit}>
            <div className="la-form-group">
              <label className="la-label">Xaaladda Shaqada</label>
              <select name="employmentStatus" value={summaryForm.employmentStatus}
                onChange={handleSummaryChange} className="la-select">
                <option>Shaqaale</option>
                <option>Shaqo-qabsi gaar ah</option>
                <option>Shaqo la'aan</option>
                <option>Hawl gabsi ka baxay</option>
                <option>Arday</option>
              </select>
            </div>

            <div className="la-form-group">
              <label className="la-label">Dakhliga Sanadka ($)</label>
              <input type="number" name="annualIncome" value={summaryForm.annualIncome}
                onChange={handleSummaryChange} placeholder="25,000" className="la-input" required />
            </div>

            <div className="la-summary-box">
              <h3 className="la-summary-title">Soo koobidda Codsiga</h3>
              {[
                ['Qaddarka Amaahda:', `$${loanApplicationData.loanAmount ? Number(loanApplicationData.loanAmount).toLocaleString() : '0'}`],
                ['Muddada Amaahda:', loanApplicationData.loanTerm || 'N/A'],
                ['Ujeedada:', loanApplicationData.purpose || 'N/A'],
                ['Codsade:', personalDetailsData.firstName && personalDetailsData.lastName
                  ? `${personalDetailsData.firstName} ${personalDetailsData.lastName}` : 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="la-summary-item">
                  <span className="la-summary-label">{label}</span>
                  <span className="la-summary-value">{value}</span>
                </div>
              ))}
            </div>

            <div className="la-btn-row">
              <button type="button" className="la-prev-btn"
                onClick={() => { updateFinancialData(summaryForm); setStep('details'); }}>
                KA HORE
              </button>
              <button type="submit" className="la-next-btn la-next-btn--flex">DIR CODSIGA</button>
            </div>
          </form>
        </div>
      </main>
      <footer className="la-footer">© 2026 Waafi Soomaaliya</footer>
    </div>
  );
}
