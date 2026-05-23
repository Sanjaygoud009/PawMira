import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  MessageCircle,
  Send,
  Sparkles,
  X,
  Heart,
  Shield,
 AlertTriangle,
} from 'lucide-react';

const initialMessages = [
  {
    id: 1,
    role: 'bot',
    text: 'Hi, I am PawMira Assistant. Ask me about the website, reporting rescues, or animal safety guidance.',
  },
];

const quickPrompts = [
  'How do I report an injured animal?',
  'What should I do if a dog is bleeding?',
  'How does the rescue feed work?',
  'Is this emergency advice enough for poisoning?',
];

const responseRules = [
  {
    patterns: ['report', 'injured', 'emergency'],
    response:
      'Use the Report Emergency page to submit a photo, location, and short description.',
  },
  {
    patterns: ['adopt', 'adoption'],
    response:
      'The Adoption page helps connect visitors with animals ready for adoption.',
  },
  {
    patterns: ['volunteer', 'support'],
    response:
      'The Volunteer page is where people can join the rescue network.',
  },
  {
    patterns: ['poison', 'toxic'],
    response:
      'If poisoning is possible, contact a veterinarian immediately.',
  },
];

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function buildAnswer(question) {
  const normalized = normalizeText(question);

  const matchedRule = responseRules.find((rule) =>
    rule.patterns.some((pattern) => normalized.includes(pattern))
  );

  if (matchedRule) {
    return matchedRule.response;
  }

  return 'I can help with PawMira features, animal safety guidance, adoption, rescue reporting, and volunteering.';
}

export default function ChatAssistant({ compact = false, floating = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState(initialMessages);

  const helperCards = useMemo(
    () => [
      {
        icon: AlertTriangle,
        title: 'Emergency reporting',
        text: 'Ask how to report injured animals.',
      },
      {
        icon: Shield,
        title: 'Safety guidance',
        text: 'Get first-aid tips for emergencies.',
      },
      {
        icon: Heart,
        title: 'Website features',
        text: 'Learn about adoption and rescue feed.',
      },
    ],
    []
  );

  function sendMessage(question) {
    const trimmed = question.trim();

    if (!trimmed) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: trimmed,
    };

    const botMessage = {
      id: Date.now() + 1,
      role: 'bot',
      text: buildAnswer(trimmed),
    };

    setMessages((current) => [...current, userMessage, botMessage]);

    setInputValue('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(inputValue);
  }

  return (
    <>
      {/* CHAT WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: 80,
              scale: 0.7,
              filter: 'blur(12px)',
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
            }}
            exit={{
              opacity: 0,
              y: 40,
              scale: 0.85,
              filter: 'blur(6px)',
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 18,
            }}
            className="fixed bottom-24 right-5 z-50 w-[380px] overflow-hidden rounded-3xl border border-white/20 bg-black/40 shadow-2xl backdrop-blur-2xl"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-orange-500/20 to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400">
                  <Bot size={24} />
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    PawMira Assistant
                  </h2>

                  <p className="text-xs text-neutral-400">
                    Website help & safety guidance
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* MESSAGES */}
            <div className="max-h-[420px] space-y-4 overflow-y-auto p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      message.role === 'user'
                        ? 'bg-orange-500 text-white'
                        : 'border border-white/10 bg-white/10 text-white'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {/* QUICK PROMPTS */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="mb-3 text-xs uppercase tracking-wider text-neutral-400">
                  Quick Prompts
                </p>

                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs text-white transition hover:bg-orange-500/20"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* HELPER CARDS */}
              <div className="grid gap-3">
                {helperCards.map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                      <item.icon size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>

                      <p className="text-xs text-neutral-400">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* INPUT */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-white/10 p-3"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <MessageCircle
                  size={18}
                  className="text-orange-400"
                />

                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about PawMira..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
                />

                <button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING BUTTON */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={floating ? { scale: 1.08, rotate: 5 } : { scale: 1.03 }}
        whileTap={{ scale: 0.9 }}
        animate={floating ? { y: [0, -8, 0] } : undefined}
        transition={
          floating
            ? {
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }
            : undefined
        }
        className={`fixed bottom-5 right-5 z-[60] flex items-center justify-center rounded-full bg-orange-500 text-white shadow-2xl shadow-orange-500/50 ${
          compact ? 'h-14 w-14' : 'h-15 w-15'
        }`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </motion.button>
    </>
  );
}