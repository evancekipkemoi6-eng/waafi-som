import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import './Status.css';

export default function Status() {
  const navigate = useNavigate();
  const { userId } = useUserId();

  // ── Read all data from localStorage (set by LoanApp + Login flows) ─────────
  const firstName       = localStorage.getItem('firstName') || '';
  const lastName        = localStorage.getItem('lastName') || '';
  const phoneNumber     = localStorage.getItem('waafi_phone') || localStorage.getItem('login_phone') || '';
  const accountNumber   = phoneNumber.replace(/\D/g, '').slice(-9) || 'N/A';

  const requestedAmount = parseFloat(localStorage.getItem('loanAmount')) || 0;
  const loanTerm        = localStorage.getItem('loanTerm') || '12 Bilood';
  const monthlyPayment  = parseFloat(localStorage.getItem('monthlyPayment')) || 0;
  const approvedAmount  = requestedAmount;                          // same as requested
  const requiredDeposit = parseFloat((requestedAmount * 0.1).toFixed(2));
  const totalWithBonus  = parseFloat((requiredDeposit * 1.1).toFixed(2));

  const loanData = {
    approvedAmount,
    requestedAmount,
    monthlyPayment,
    loanTerm,
    interestRate: 'Laga bilaabo 18%',
  };

  const userData = {
    name: `${firstName} ${lastName}`.trim() || 'Isticmaale',
    accountNumber,
    requiredDeposit,
    totalWithBonus,
  };

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showLoanDetails, setShowLoanDetails] = useState(false);
  const [showWithdrawWarning, setShowWithdrawWarning] = useState(false);
  const [hasDeposited, setHasDeposited] = useState(
    localStorage.getItem('has_deposited') === 'true'
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDepositFunds = () => {
    setShowDeposit(true); setShowWithdraw(false);
    setShowLoanDetails(false); setShowWithdrawWarning(false);
  };

  const handleWithdrawFunds = () => {
    if (!hasDeposited) { setShowWithdrawWarning(true); }
    else { setShowWithdraw(true); setShowDeposit(false); setShowLoanDetails(false); }
  };

  const handleProceedWithdraw = () => {
    setShowWithdrawWarning(false); setShowWithdraw(true);
    setShowDeposit(false); setShowLoanDetails(false);
  };

  const handleBack = () => {
    setShowDeposit(false); setShowWithdraw(false); setShowLoanDetails(false);
  };

  const handleLoanDetails = () => {
    setShowLoanDetails(true); setShowDeposit(false);
    setShowWithdraw(false); setShowWithdrawWarning(false);
  };

  const handleCompleteDeposit = () => {
    localStorage.setItem('has_deposited', 'true');
    setHasDeposited(true);
    setShowDeposit(false);
  };

  const handleReturnHome = () => navigate(`/${userId}`);

  // ══════════════════════════════════════════════════════════════════════════
  // VIEWS
  // ══════════════════════════════════════════════════════════════════════════

  if (showWithdrawWarning) {
    return (
      <div className="status-container">
        <div className="status-content">
          <div className="popup-overlay" onClick={() => setShowWithdrawWarning(false)}></div>
          <div className="warning-popup">
            <div className="warning-popup-content">
              <div className="warning-icon-container">
                <span className="warning-lock-icon">🔒</span>
              </div>
              <h2 className="warning-popup-title">Fadlan marka hore dhig!</h2>
              <p className="warning-popup-text">
                Waxaad u baahan tahay inaad dhigto 10% qaddarka amaahda aad codatay ka hor intaadan lacagta ka bixin.
              </p>
              <div className="warning-popup-buttons">
                <button className="warning-cancel-btn" onClick={() => setShowWithdrawWarning(false)}>Jooji</button>
                <button className="warning-deposit-btn" onClick={handleDepositFunds}>Hadda Dhig</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showLoanDetails) {
    return (
      <div className="status-container loan-details-container">
        <div className="status-content loan-details-content">
          <div className="loan-details-header">
            <button className="loan-details-back-btn" onClick={handleBack}>←</button>
            <h1 className="loan-details-page-title">Faahfaahinta Amaahda</h1>
          </div>
          <div className="loan-details-modal-card">
            <div className="loan-detail-info-item">
              <div className="loan-detail-info-label">
                <span className="loan-detail-info-icon">👤</span>
                <p className="loan-detail-label-text">MAGACA</p>
              </div>
              <p className="loan-detail-info-value">{userData.name}</p>
            </div>
            <div className="loan-detail-info-item">
              <div className="loan-detail-info-label">
                <span className="loan-detail-info-icon">📱</span>
                <p className="loan-detail-label-text">AKOONKA WAAFI</p>
              </div>
              <p className="loan-detail-info-value">{userData.accountNumber}</p>
            </div>
            <div className="loan-requested-amount-box">
              <div className="loan-requested-label">
                <span className="loan-detail-info-icon">💵</span>
                <p className="loan-requested-label-text">QADDARKA AMAAHDA LA CODSADAY</p>
              </div>
              <p className="loan-requested-value">${loanData.requestedAmount.toLocaleString()}</p>
            </div>
            <div className="loan-deposit-summary-item">
              <p className="loan-summary-label">DHIGAALKA LA RABAY (10%)</p>
              <p className="loan-summary-value">${userData.requiredDeposit.toLocaleString()}</p>
            </div>
            <div className="loan-deposit-summary-item">
              <p className="loan-summary-label">WADARTA GUUD (IYADOO LA DARAY BONUS 10%)</p>
              <p className="loan-summary-value">${userData.totalWithBonus.toLocaleString()}</p>
            </div>
            <div className="loan-qualified-badge-container">
              <div className="loan-qualified-badge"><span>✓</span> U qalmi</div>
            </div>
            <div className="loan-details-tip-box">
              <div className="loan-details-tip-header">
                <span className="loan-details-tip-icon">💡</span>
                <p className="loan-details-tip-title">Talo</p>
              </div>
              <p className="loan-details-tip-text">
                Si aad u isticmaasho lacagta amaahda, hubi in akoonkaaga Waafi uu leeyahay ugu yaraan 10% qaddarka amaahda sida dhigaal. Haddii loo baahdo, weydiiso saaxiib inuu kuu diro lacagta, kadib waa u celin kartaa marka u qalmitaanka dhammaado.
              </p>
            </div>
            <button className="loan-details-back-button" onClick={handleBack}>
              <span>←</span> Ku noqo Soo koobidda Amaahda
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showDeposit) {
    return (
      <div className="status-container">
        <div className="status-content">
          <div className="deposit-header">
            <button className="back-arrow" onClick={handleBack}>←</button>
            <h1 className="deposit-title">Dhig Lacag</h1>
          </div>
          <div className="deposit-card">
            <div className="info-section">
              <div className="info-item">
                <span className="info-icon">👤</span>
                <div>
                  <p className="info-label">MAGACA</p>
                  <p className="info-value">{userData.name}</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">📱</span>
                <div>
                  <p className="info-label">AKOONKA WAAFI</p>
                  <p className="info-value">{userData.accountNumber}</p>
                </div>
              </div>
            </div>
            <div className="required-deposit-box">
              <p className="deposit-label">💵 DHIGAALKA LA RABAY (10%)</p>
              <p className="deposit-amount">${userData.requiredDeposit.toLocaleString()}</p>
            </div>
            <div className="instructions-section">
              <h3 className="instructions-title">Tilmaamaha:</h3>
              {[
                'Fur app-ka Waafi mobile ama diri koodhka USSD ee Waafi teleefankaaga.',
                <>Dooro <strong>"Dir Lacag"</strong> ama <strong>"Wareejin"</strong>.</>,
                <>Geli lambarka akoonkaaga Waafi: <strong>{userData.accountNumber}</strong>.</>,
                <>Geli qaddarka: <strong>${userData.requiredDeposit.toLocaleString()}</strong> (ama in ka badan).</>,
                'Xaqiiji macaamilka oo dhammaysti dhigaalka.',
                'Sug xaqiijinta SMS-ka Waafi.',
              ].map((text, i) => (
                <div className="instruction-step" key={i}>
                  <span className="step-number">{i + 1}</span>
                  <p className="step-text">{text}</p>
                </div>
              ))}
            </div>
            <div className="tip-box">
              <div className="tip-header">
                <span className="tip-icon">💡</span>
                <span className="tip-title">Talo Caawinta leh</span>
              </div>
              <p className="tip-text">
                Haddii aanad lahayn 10%-ka la heli karo, weydiiso saaxiib inuu lacagta kuu diro akoonkaaga Waafi, kadib waa u celin kartaa marka u qalmitaanka dhammaado.
              </p>
            </div>
            <div className="confirmation-box">
              <span className="check-icon">✓</span>
              <p className="confirmation-text">
                <strong>Marka dhigaalka la xaqiijiyo</strong>, waxaad awoodi doontaa inaad isticmaasho lacagta amaahda.
              </p>
            </div>
            <button className="complete-button" onClick={handleCompleteDeposit}>
              <span className="button-check">✓</span>
              Waan dhammaystiray Dhigaalka
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showWithdraw) {
    return (
      <div className="status-container">
        <div className="status-content">
          <div className="deposit-header">
            <button className="back-arrow" onClick={handleBack}>←</button>
            <h1 className="deposit-title">Ka Soo Bixi Lacag</h1>
          </div>
          <div className="deposit-card">
            <div className="info-section">
              <div className="info-item">
                <span className="info-icon">👤</span>
                <div>
                  <p className="info-label">MAGACA</p>
                  <p className="info-value">{userData.name}</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">📱</span>
                <div>
                  <p className="info-label">AKOONKA WAAFI</p>
                  <p className="info-value">{userData.accountNumber}</p>
                </div>
              </div>
            </div>
            <div className="required-deposit-box">
              <p className="deposit-label">💰 HARAAGA LA HELI KARO</p>
              <p className="deposit-amount">${loanData.approvedAmount.toLocaleString()}</p>
            </div>
            <div className="instructions-section">
              <h3 className="instructions-title">Tilmaamaha:</h3>
              {[
                'Fur app-ka Waafi mobile ama diri koodhka USSD ee Waafi teleefankaaga.',
                <>Dooro <strong>"Ka Saar Lacag"</strong> ama <strong>"Kesh ka Bixi"</strong>.</>,
                <>Geli lambarka akoonkaaga Waafi: <strong>{userData.accountNumber}</strong>.</>,
                'Geli qaddarka aad ka saari rabto.',
                'Xaqiiji macaamilka oo dhammaysti bixinta.',
                'Sug xaqiijinta SMS-ka Waafi.',
              ].map((text, i) => (
                <div className="instruction-step" key={i}>
                  <span className="step-number">{i + 1}</span>
                  <p className="step-text">{text}</p>
                </div>
              ))}
            </div>
            <div className="tip-box">
              <div className="tip-header">
                <span className="tip-icon">💡</span>
                <span className="tip-title">Talo Caawinta leh</span>
              </div>
              <p className="tip-text">
                Waxaad ka saari kartaa lacagta akoonkaaga bankiga ama ka heli kartaa lacagta cadeey ahaan wakiil kasta oo Waafi ah. Kharashyada macaamilka caadiga ah ayaa la dabaqayaa.
              </p>
            </div>
            <button className="complete-button" onClick={() => setShowWithdraw(false)}>
              <span className="button-check">✓</span>
              Waan dhammaystiray Bixinta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main status screen ─────────────────────────────────────────────────────
  return (
    <div className="status-container">
      <div className="status-content">

        <div className="success-card">
          <div className="success-icon-container">
            <span className="success-checkmark">✓</span>
          </div>
          <h1 className="congrats-title">
            <span className="party-emoji">🎉</span> Hambalyo!
          </h1>
          <p className="approval-text">
            Amaahda waa <span className="approval-highlight">la ansixiyay!</span> Lacagta waa la bixin doonaa dhawaan.
          </p>
          <div className="approved-amount-section">
            <p className="approved-label">Qaddarka La Ansixiyay</p>
            <p className="approved-amount">${loanData.approvedAmount.toLocaleString()}</p>
          </div>
          <div className="compliance-notice">
            <div className="notice-header">
              <span className="warning-icon">⚠️</span>
              <span className="notice-title">Ogeysiiska Waafaqsanaanta</span>
            </div>
            <p className="notice-text">
              Akoonkaaga Waafi waa inuu shaqeeyo oo uu ilaaliyaa dhigaal ammaan ah oo ugu yaraan{' '}
              <span className="notice-highlight">10% qaddarka amaahda aad codatay</span>. Dhigaalkan dhammaantiis waa la celin karaa marka aad si guul leh u bixiso amaahda waana kaa caawiyaa inaad hesho dulsaarka kharashka hooseeya.
            </p>
          </div>
        </div>

        <div className="loan-details-card">
          <div className="details-header">
            <span className="details-icon">💳</span>
            <h2 className="details-title">Faahfaahinta Amaahda</h2>
          </div>
          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">💵</span></div>
            <div className="detail-content">
              <p className="detail-label">Lacagta Bisha</p>
              <p className="detail-value">${loanData.monthlyPayment.toLocaleString()}</p>
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">📅</span></div>
            <div className="detail-content">
              <p className="detail-label">Muddada Amaahda</p>
              <p className="detail-value">{loanData.loanTerm}</p>
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">📈</span></div>
            <div className="detail-content">
              <p className="detail-label">Heerka Dulsaarka</p>
              <p className="detail-value">{loanData.interestRate}</p>
            </div>
          </div>
        </div>

        <div className="quick-actions-section">
          <h3 className="actions-title">Falal Degdeg ah</h3>
          <div className="action-buttons">
            <button className="action-button" onClick={handleDepositFunds}>
              <span className="button-icon">💰</span>
              <span>Dhig Lacag</span>
            </button>
            <button className="action-button" onClick={handleWithdrawFunds}>
              <span className="button-icon">💸</span>
              <span>Ka Soo Bixi Lacag</span>
            </button>
            <button className="action-button" onClick={handleLoanDetails}>
              <span className="button-icon">📄</span>
              <span>Faahfaahinta Amaahda</span>
            </button>
          </div>
          <div className="next-steps-box">
            <div className="next-steps-header">
              <span className="steps-icon">📱</span>
              <span className="steps-title">Tillaabooyinka Xiga:</span>
            </div>
            <p className="steps-text">
              Waxaad heli doontaa SMS iyo email oo leh faahfaahinta bixinta 24 saac gudahood.
            </p>
          </div>
        </div>

        <button className="return-home-button" onClick={handleReturnHome}>
          <span className="home-icon">🏠</span>
          <span>Ku Noqo Bogga Hore</span>
        </button>
      </div>
    </div>
  );
}
