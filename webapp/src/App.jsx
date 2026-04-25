import { useState, useEffect } from 'react'
import './index.css'
import cardsDb from './data/cards.json';
import configDb from './data/config.json';

const WebApp = window.Telegram.WebApp;

function App() {
  const [step, setStep] = useState('welcome');
  const [userData, setUserData] = useState({
    name: '',
    username: '',
    question: '',
    direction: '',
    cards: [],
    clickedBooking: false
  });
  const [currentCard, setCurrentCard] = useState(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    if (WebApp.initDataUnsafe?.user) {
      setUserData(prev => ({
        ...prev,
        name: WebApp.initDataUnsafe.user.first_name || '',
        username: WebApp.initDataUnsafe.user.username || ''
      }));
    }
  }, []);

  const saveLead = async (data) => {
    try {
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.log('Tracking client side');
    }
  };

  const pullCard = (type) => {
    const category = cardsDb[type];
    if (!category) return;
    const card = category[Math.floor(Math.random() * category.length)];
    setCurrentCard(card);
    setCardFlipped(false);
    setUserData(prev => ({ ...prev, cards: [...prev.cards, card.image] }));
  };

  return (
    <div className="app-container">
      {/* 1. WELCOME SCREEN */}
      {step === 'welcome' && (
        <div className="screen welcome-screen fade-in">
          <div className="glass-panel">
            <h1>{configDb.welcomeTitle}</h1>
            <p style={{ whiteSpace: 'pre-line' }}>{configDb.welcomeText}</p>
            <button className="primary-btn glow mt-4" onClick={() => {
              WebApp.HapticFeedback.impactOccurred('light');
              setStep('intro-card1');
            }}>
              {configDb.welcomeButton}
            </button>
          </div>
        </div>
      )}

      {/* 2. INTRO TO CARD 1 */}
      {step === 'intro-card1' && (
        <div className="screen fade-in">
          <div className="glass-panel center-content">
            <h2>Сейчас смотри внимательно.</h2>
            <h3 className="step-title">Карта 1. Ситуация</h3>
            <p>Что происходит на самом деле?</p>
            <button className="primary-btn mt-4" onClick={() => {
              pullCard('status');
              setStep('card1');
            }}>
              Вытянуть карту
            </button>
          </div>
        </div>
      )}

      {/* 3. CARD 1 */}
      {step === 'card1' && (
        <div className="screen card-screen fade-in">
          <div className="glass-panel">
            <h2 className="step-title">Карта 1. Ситуация</h2>
            <div className="card-container" onClick={() => setCardFlipped(true)}>
              <div className={`card-inner ${cardFlipped ? 'flipped' : ''}`}>
                <div className="card-front"><div className="tap-hint">Нажми, чтобы открыть</div></div>
                <div className="card-back">
                  <div className="card-image-wrapper">
                    <img src={`/images/${currentCard?.image}`} alt="Карта 1" className="card-image" />
                    <div className="card-glow"></div>
                  </div>
                  <p className="card-meaning">{currentCard?.text}</p>
                </div>
              </div>
            </div>
            {cardFlipped && (
              <div className="feedback-section fade-in">
                <p>Это сейчас про тебя?<br/>Или пока не хочется это признавать?</p>
                <div className="button-row">
                  <button onClick={() => setStep('inga-intro')}>🎯 да, в точку</button>
                  <button onClick={() => setStep('inga-intro')}>🤔 частично</button>
                  <button onClick={() => setStep('inga-intro')}>❌ не откликается</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. INGA INTRO */}
      {step === 'inga-intro' && (
        <div className="screen fade-in">
          <div className="glass-panel center-content">
            <p>Это мини-игра от Инги Беляковой.</p>
            <p>Я создаю трансформационные игры,<br/>которые показывают правду<br/>и доводят до результата.</p>
            <button className="primary-btn mt-4" onClick={() => setStep('brake-intro')}>
              Смотреть глубже
            </button>
          </div>
        </div>
      )}

      {/* 5. BRAKE INTRO */}
      {step === 'brake-intro' && (
        <div className="screen fade-in">
          <div className="glass-panel center-content">
            <p>Дело не в ситуации.</p>
            <p>А в том, как ты в ней действуешь.</p>
            <p>Сейчас покажу, где именно ты себя тормозишь.</p>
            <button className="primary-btn mt-4" onClick={() => {
              pullCard('obstacle');
              setStep('card2');
            }}>
              Смотреть глубже
            </button>
          </div>
        </div>
      )}

      {/* 6. CARD 2 */}
      {step === 'card2' && (
        <div className="screen card-screen fade-in">
          <div className="glass-panel">
            <h2 className="step-title">Карта 2. Внутренний тормоз</h2>
            <p className="text-center mb-2">Посмотри внимательно.</p>
            <div className="card-container" onClick={() => setCardFlipped(true)}>
              <div className={`card-inner ${cardFlipped ? 'flipped' : ''}`}>
                <div className="card-front"><div className="tap-hint">Открыть</div></div>
                <div className="card-back">
                  <div className="card-image-wrapper">
                    <img src={`/images/${currentCard?.image}`} alt="Карта 2" className="card-image" />
                    <div className="card-glow"></div>
                  </div>
                  <p className="card-meaning">{currentCard?.text}</p>
                </div>
              </div>
            </div>
            {cardFlipped && (
              <div className="feedback-section fade-in">
                <p>Узнаёшь себя?</p>
                <div className="button-row">
                  <button onClick={() => setStep('post-card2-insight')}>😬 да, есть такое</button>
                  <button onClick={() => setStep('post-card2-insight')}>🤏 частично</button>
                  <button onClick={() => setStep('post-card2-insight')}>❌ не про меня</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. POST CARD 2 INSIGHT */}
      {step === 'post-card2-insight' && (
        <div className="screen fade-in">
          <div className="glass-panel center-content">
            <p>Вот поэтому и нет сдвига.</p>
            <p>Не из-за ситуации. А из-за того, как ты действуешь внутри неё.</p>
            <button className="primary-btn mt-4" onClick={() => setStep('step-intro')}>
              Поняла → что дальше
            </button>
          </div>
        </div>
      )}

      {/* 8. STEP INTRO */}
      {step === 'step-intro' && (
        <div className="screen fade-in">
          <div className="glass-panel center-content">
            <p>Теперь не про причину.</p>
            <p>А про шаг, который реально может сдвинуть тебя.</p>
            <button className="primary-btn mt-4" onClick={() => {
              pullCard('step');
              setStep('card3');
            }}>
              Показать мой шаг
            </button>
          </div>
        </div>
      )}

      {/* 9. CARD 3 */}
      {step === 'card3' && (
        <div className="screen card-screen fade-in">
          <div className="glass-panel">
            <h2 className="step-title">Карта 3. Твой шаг</h2>
            <div className="card-container" onClick={() => setCardFlipped(true)}>
              <div className={`card-inner ${cardFlipped ? 'flipped' : ''}`}>
                <div className="card-front"><div className="tap-hint">Открыть</div></div>
                <div className="card-back">
                  <div className="card-image-wrapper">
                    <img src={`/images/${currentCard?.image}`} alt="Карта 3" className="card-image" />
                    <div className="card-glow"></div>
                  </div>
                  <p className="card-meaning">{currentCard?.text}</p>
                </div>
              </div>
            </div>
            {cardFlipped && (
              <div className="feedback-section fade-in">
                <p>Смотри. Вот твой шаг. Не идеальный. Не когда-нибудь потом.<br/><br/>А тот, который реально можно сделать.</p>
                <p>Готова сделать это? Не идеально. Но уже сегодня.</p>
                <div className="button-row">
                  <button onClick={() => {
                    saveLead({ ...userData, clickedBooking: true });
                    setStep('final');
                  }}>🔥 да, сделаю сегодня</button>
                  <button onClick={() => {
                    saveLead(userData);
                    setStep('final');
                  }}>🤔 подумаю</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. FINAL SCREEN */}
      {step === 'final' && (
        <div className="screen final-screen fade-in">
          <div className="glass-panel center-content">
            <h2 style={{ fontSize: '1.4rem' }}>{configDb.finalMessageTitle}</h2>
            <div style={{ whiteSpace: 'pre-line', fontSize: '0.95rem', marginBottom: '20px' }}>
              {configDb.finalMessageBody1}
            </div>
            
            <div style={{ whiteSpace: 'pre-line', fontSize: '1rem', fontWeight: '500', color: 'var(--accent)' }}>
              {configDb.finalMessageBodyFinal}
            </div>
            
            {!showContacts ? (
              <button className="primary-btn mt-4" onClick={() => setShowContacts(true)}>
                {configDb.ctaButtonText}
              </button>
            ) : (
              <div className="fade-in" style={{ width: '100%' }}>
                <p className="contact-label mt-4">Выбери способ связи:</p>
                <div className="contact-grid">
                  <a href={configDb.contactLink} target="_blank" rel="noopener noreferrer" className="contact-button telegram">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.48 1.02-.73 3.98-1.73 6.64-2.88 7.99-3.45 3.8-1.61 4.59-1.89 5.11-1.9.11 0 .37.03.53.16.14.11.18.26.2.38.02.12.02.26.01.39z"/>
                    </svg>
                    Telegram
                  </a>
                  <a href={configDb.instagramLink} target="_blank" rel="noopener noreferrer" className="contact-button instagram">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </a>
                </div>
              </div>
            )}

            <button className="text-btn mt-4" onClick={() => WebApp.close()}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
