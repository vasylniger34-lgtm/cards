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

  useEffect(() => {
    // Notify Telegram that the app is ready and expand it to full height
    WebApp.ready();
    WebApp.expand();
    
    // Set user data if available from Telegram context
    if (WebApp.initDataUnsafe?.user) {
      setUserData(prev => ({
        ...prev,
        name: WebApp.initDataUnsafe.user.first_name || '',
        username: WebApp.initDataUnsafe.user.username || ''
      }));
    }
  }, []);

  const saveLead = async (data) => {
    if (WebApp.sendData) {
      // Send data natively to Telegram text chat if supported (for keyboard buttons)
      WebApp.sendData(JSON.stringify(data));
    }
    // Alternatively, we can assume backend api is on same domain, but we are static on Vercel
    try {
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.log('Failed to save to backend api, but tracking client side');
    }
  };

  const pullCard = (type) => {
    const category = cardsDb[type];
    if (!category) return;
    const card = category[Math.floor(Math.random() * category.length)];
    setCurrentCard(card);
    setCardFlipped(false);
    
    setUserData(prev => ({
      ...prev,
      cards: [...prev.cards, card.image]
    }));
  };

  return (
    <div className="app-container">
      {step === 'welcome' && (
        <div className="screen welcome-screen fade-in">
          <div className="glass-panel">
            <h1>Привет 🤍</h1>
            <p>Ты попала в мини-игру от Инги Беляковой. За несколько минут ты увидишь:</p>
            <ul>
              <li>— что сейчас происходит в твоём запросе</li>
              <li>— где тебя реально тормозит</li>
              <li>— какой шаг поможет сдвинуться с места</li>
            </ul>
            <div className="input-group">
              <label>Задай внутри один вопрос, который сейчас важен:</label>
              <textarea 
                placeholder="Что меня беспокоит прямо сейчас..."
                value={userData.question}
                onChange={(e) => setUserData({...userData, question: e.target.value})}
              />
            </div>
            <button 
              className={`primary-btn ${!userData.question.trim() ? 'disabled' : ''}`}
              onClick={() => {
                if(userData.question.trim()) {
                  WebApp.HapticFeedback.impactOccurred('light');
                  setStep('direction');
                }
              }}
            >
              ПРОДОЛЖИТЬ
            </button>
          </div>
        </div>
      )}

      {step === 'direction' && (
        <div className="screen direction-screen fade-in">
           <div className="glass-panel">
            <h2>Что тебя сейчас больше всего цепляет?</h2>
            <p>Выбери направление:</p>
            <div className="button-grid">
              {[
                {id: 'money', label: '💰 Деньги / доход'},
                {id: 'energy', label: '💭 Состояние / энергия'},
                {id: 'self', label: '🔥 Самореализация'},
                {id: 'love', label: '❤️ Отношения'},
                {id: 'next', label: '🚀 Следующий шаг'}
              ].map(dir => (
                <button 
                  key={dir.id}
                  className="secondary-btn"
                  onClick={() => {
                    WebApp.HapticFeedback.impactOccurred('medium');
                    setUserData({...userData, direction: dir.id});
                    setStep('ready');
                  }}
                >
                  {dir.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'ready' && (
        <div className="screen ready-screen fade-in">
           <div className="glass-panel center-content">
            <h2>Сейчас ты вытянешь 3 карты...</h2>
            <button 
              className="primary-btn glow"
              onClick={() => {
                WebApp.HapticFeedback.impactOccurred('heavy');
                pullCard('status');
                setStep('card1');
              }}
            >
              ВЫТЯНУТЬ 1 КАРТУ
            </button>
          </div>
        </div>
      )}

      {step === 'card1' && (
        <div className="screen card-screen fade-in">
          <div className="glass-panel">
            <h2 className="step-title">Карта 1: Ситуация</h2>
            <p className="card-overlay-text">Где ты уже видишь это, но продолжаешь делать вид, что «всё нормально»?</p>
            
            <div className={`card-container ${cardFlipped ? 'flipped' : ''}`} onClick={() => setCardFlipped(true)}>
              <div className="card-flipper">
                <div className="card-front">
                  <div className="tap-hint">Кликни, чтобы перевернуть</div>
                </div>
                <div className="card-back">
                  <img src={`/images/${currentCard?.image}`} alt="Карта 1" className="card-image" />
                  <p className="card-meaning">{currentCard?.text}</p>
                </div>
              </div>
            </div>

            {cardFlipped && (
              <div className="feedback-section fade-in">
                <p>Это сейчас про тебя?</p>
                <div className="button-row">
                  <button onClick={() => { setStep('pre-card2'); WebApp.HapticFeedback.impactOccurred('light'); }}>🎯 да, в точку</button>
                  <button onClick={() => { setStep('pre-card2'); WebApp.HapticFeedback.impactOccurred('light'); }}>🤔 частично</button>
                  <button onClick={() => { setStep('pre-card2'); WebApp.HapticFeedback.impactOccurred('light'); }}>❌ не откликается</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'pre-card2' && (
        <div className="screen ready-screen fade-in">
           <div className="glass-panel center-content">
            <h2>Не про ситуацию — а про то, где ты сама себя тормозишь.</h2>
            <button 
              className="primary-btn glow"
              onClick={() => {
                WebApp.HapticFeedback.impactOccurred('heavy');
                pullCard('obstacle');
                setStep('card2');
              }}
            >
              ВЫТЯНУТЬ 2 КАРТУ
            </button>
          </div>
        </div>
      )}

      {step === 'card2' && (
        <div className="screen card-screen fade-in">
          <div className="glass-panel">
             <h2 className="step-title">Карта 2: Внутренний тормоз</h2>
            
            <div className={`card-container ${cardFlipped ? 'flipped' : ''}`} onClick={() => setCardFlipped(true)}>
              <div className="card-flipper">
                <div className="card-front">
                  <div className="tap-hint">Кликни, чтобы перевернуть</div>
                </div>
                <div className="card-back">
                  <img src={`/images/${currentCard?.image}`} alt="Карта 2" className="card-image" />
                  <p className="card-meaning">{currentCard?.text}</p>
                </div>
              </div>
            </div>

            {cardFlipped && (
              <div className="feedback-section fade-in">
                <p>Узнаёшь себя?</p>
                <div className="button-row">
                  <button onClick={() => { setStep('pre-card3'); WebApp.HapticFeedback.impactOccurred('light'); }}>😬 да, есть такое</button>
                  <button onClick={() => { setStep('pre-card3'); WebApp.HapticFeedback.impactOccurred('light'); }}>🤏 частично</button>
                  <button onClick={() => { setStep('pre-card3'); WebApp.HapticFeedback.impactOccurred('light'); }}>❌ не про меня</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'pre-card3' && (
        <div className="screen ready-screen fade-in">
           <div className="glass-panel center-content">
            <h2>Вот почему нет сдвига. Давайте посмотрим, что делать.</h2>
            <button 
              className="primary-btn glow"
              onClick={() => {
                WebApp.HapticFeedback.impactOccurred('heavy');
                pullCard('step');
                setStep('card3');
              }}
            >
              ВЫТЯНУТЬ 3 КАРТУ
            </button>
          </div>
        </div>
      )}

      {step === 'card3' && (
        <div className="screen card-screen fade-in">
          <div className="glass-panel">
            <h2 className="step-title">Карта 3: Ваш Шаг</h2>
            <p className="card-overlay-text">Вот твой шаг. Не идеальный. Не когда-нибудь потом. А тот, который реально можно сделать.</p>

            <div className={`card-container ${cardFlipped ? 'flipped' : ''}`} onClick={() => setCardFlipped(true)}>
              <div className="card-flipper">
                <div className="card-front">
                  <div className="tap-hint">Кликни, чтобы перевернуть</div>
                </div>
                <div className="card-back">
                  <img src={`/images/${currentCard?.image}`} alt="Карта 3" className="card-image" />
                  <p className="card-meaning">{currentCard?.text}</p>
                </div>
              </div>
            </div>

            {cardFlipped && (
              <div className="feedback-section fade-in">
                <p>Готовы попробовать сделать этот шаг?</p>
                <div className="button-row">
                  <button onClick={() => { 
                    const newData = {...userData, clickedBooking: true};
                    setUserData(newData);
                    saveLead(newData);
                    setStep('final'); 
                  }}>сделаю в течение 24 часов</button>
                  <button onClick={() => { saveLead(userData); setStep('final'); }}>подумаю как</button>
                  <button onClick={() => { saveLead(userData); setStep('final'); }}>позже</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'final' && (
        <div className="screen final-screen fade-in">
          <div className="glass-panel center-content">
            <h2>{configDb.finalMessageTitle}</h2>
            <p>{configDb.finalMessageBody1}</p>
            <p>{configDb.finalMessageBody2}</p>
            <p>{configDb.finalMessageBody3}</p>
            
            <a href={configDb.contactLink} target="_blank" rel="noopener noreferrer" className="primary-btn" style={{textDecoration: 'none', display: 'inline-block', marginTop: '20px'}}>
              {configDb.ctaButtonText}
            </a>
            
            <button className="text-btn" style={{marginTop: '15px'}} onClick={() => WebApp.close()}>
              Закрыть
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
