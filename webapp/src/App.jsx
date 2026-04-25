import { useState, useEffect } from 'react'
import './index.css'
import cardsDb from './data/cards.json';

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
    try {
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartGame = () => {
    if (!userData.question.trim()) return;
    setStep('direction');
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

  const revealCard = () => {
    setCardFlipped(true);
    // Vibrate/haptic feedback if supported via Telegram SDK
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
  };

  const renderWelcome = () => (
    <div className="screen fade-in">
      <div className="screen-content">
        <h1 className="text-center mb-1">Привіт 🤍</h1>
        <p className="text-center text-secondary mb-4">
          Ти потрапила в міні-гру від Інги Бєлякової.
        </p>
        <div className="glass-panel mb-4">
          <p className="mb-2 text-sm">За кілька хвилин ти побачиш:</p>
          <ul className="text-sm text-secondary" style={{ paddingLeft: '20px', margin: 0 }}>
            <li className="mb-1">що зараз відбувається у твоєму запиті</li>
            <li className="mb-1">де тебе реально гальмує</li>
            <li>який крок допоможе зрушити з місця</li>
          </ul>
        </div>
        <h3 className="mb-2">Задай своє питання:</h3>
        <input 
          type="text" 
          className="glass-input mb-4" 
          placeholder="Що тебе зараз найбільше чіпляє?" 
          value={userData.question}
          onChange={(e) => setUserData({...userData, question: e.target.value})}
        />
        <button 
          className="primary" 
          onClick={handleStartGame}
          disabled={!userData.question.trim()}
          style={{ opacity: userData.question.trim() ? 1 : 0.5 }}
        >
          ПОЧАТИ ГРУ
        </button>
      </div>
    </div>
  );

  const renderDirection = () => (
    <div className="screen fade-in">
      <div className="screen-content">
        <h2 className="mb-2">Вибери напрямок</h2>
        <p className="text-secondary mb-4 text-sm">
          Тримай у голові свій запит саме в цьому напрямку.
        </p>
        <div className="choice-grid mb-4">
          {['💰 Гроші / дохід', '💭 Стан / енергія', '🔥 Самореалізація', '❤️ Стосунки', '🚀 Наступний крок'].map(dir => (
            <button key={dir} onClick={() => {
              setUserData({...userData, direction: dir});
              pullCard('status');
              setStep('card1_pull');
            }}>
              {dir}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCardStage = (title, subtitle, nextStep, feedbackOptions, isLast = false) => (
    <div className="screen fade-in" style={{ paddingBottom: cardFlipped ? '240px' : '24px' }}>
      <h2 className="text-center mb-1">{title}</h2>
      {subtitle && <p className="text-center text-secondary text-sm mb-2">{subtitle}</p>}
      
      <div className="card-stage" onClick={!cardFlipped ? revealCard : undefined}>
        <div className="card-container">
          <div className={`card-inner ${cardFlipped ? 'flipped' : ''}`}>
            <div className="card-front">
              <div className="card-front-icon">✨</div>
              <p className="mt-4" style={{fontWeight: 500}}>Натисни, щоб відкрити</p>
            </div>
            <div className="card-back">
              {currentCard && <img src={`/images/${currentCard.image}`} alt="Карта" />}
            </div>
          </div>
        </div>
      </div>
      
      {cardFlipped && (
        <div className="reflection-overlay slide-up">
          <div className="glass-panel" style={{ padding: '20px' }}>
            <p className="mb-3 text-sm" style={{ lineHeight: 1.5 }}>
              {currentCard?.text || 'Рефлексія...'}
            </p>
            <div className="choice-grid">
              {feedbackOptions.map(opt => (
                <button 
                  key={opt.label} 
                  className={opt.primary ? 'primary' : ''}
                  onClick={() => {
                    if (isLast) {
                      if (opt.action === 'book') setUserData(p => ({...p, clickedBooking: true}));
                      const finalData = {...userData, clickedBooking: opt.action === 'book' || userData.clickedBooking};
                      saveLead(finalData);
                      setStep('final');
                    } else {
                      pullCard(nextStep.type);
                      setStep(nextStep.step);
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFinal = () => (
    <div className="screen fade-in">
      <div className="screen-content text-center">
        <div style={{fontSize: '48px', marginBottom: '16px'}}>✨</div>
        <h2 className="mb-2">Ось тут починається різниця</h2>
        <p className="text-secondary text-sm mb-4" style={{ lineHeight: 1.6 }}>
          Можна все зрозуміти — і залишити як є. <br/>
          А можна зробити крок — і отримати інший результат.
        </p>
        <div className="glass-panel text-left mb-4">
          <p className="text-sm">
            Якщо хочеш розібрати свій запит не в 3 кроках, а до реальних змін — приходь на повноцінну гру. Ми докрутимо все до дії та результату.
          </p>
        </div>
        <div className="choice-grid">
          <button className="primary" onClick={() => WebApp.openTelegramLink('https://t.me/inga_belyakova')}>
            НАПИСАТИ ІНЗІ
          </button>
          <button onClick={() => WebApp.close()}>
            ЗАКРИТИ ГРУ
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App">
      {step === 'welcome' && renderWelcome()}
      {step === 'direction' && renderDirection()}
      
      {step === 'card1_pull' && renderCardStage(
        'Карта 1', 'Що відбувається насправді', 
        { step: 'card2_pull', type: 'obstacle' },
        [
          { label: '🎯 Так, в точку', primary: true },
          { label: '🤔 Частково' },
          { label: '❌ Не відгукується' }
        ]
      )}

      {step === 'card2_pull' && renderCardStage(
        'Карта 2', 'Що тебе гальмує', 
        { step: 'card3_pull', type: 'step' },
        [
          { label: '😬 Так, є таке', primary: true },
          { label: '🤏 Частково діє' },
          { label: '❌ Не про мене' }
        ]
      )}

      {step === 'card3_pull' && renderCardStage(
        'Карта 3', 'Твій крок', 
        null,
        [
          { label: 'Зроблю це в найближчі 24г', primary: true, action: 'book' },
          { label: 'Подумаю як це зробити', action: 'think' },
          { label: 'Можливо пізніше', action: 'later' }
        ],
        true
      )}

      {step === 'final' && renderFinal()}
    </div>
  )
}

export default App
