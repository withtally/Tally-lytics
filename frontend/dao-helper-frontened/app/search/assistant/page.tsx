'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

export default function AIAssistantPage() {
  const [userQuestion, setUserQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<
    { role: string; content: string; timestamp: string }[]
  >([
    {
      role: 'assistant',
      content:
        "Hello! I'm your DAO research assistant. I can help you analyze DAO governance proposals, summarize discussions, find information, and more. How can I assist you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sample suggested questions
  const suggestedQuestions = [
    'What are the latest governance proposals for Uniswap?',
    "Summarize MakerDAO's treasury management strategy",
    "Explain Aave's risk management framework",
    'What are the common trends in DEX governance?',
    'Compare voting participation across major DAOs',
  ];

  // Mock function to simulate sending a question to the AI
  const sendQuestion = () => {
    if (!userQuestion.trim()) return;

    // Add user question to chat
    const newUserMessage = {
      role: 'user',
      content: userQuestion,
      timestamp: new Date().toISOString(),
    };

    setChatHistory(prev => [...prev, newUserMessage]);
    setIsProcessing(true);

    // Clear input
    setUserQuestion('');

    // Simulate AI response delay
    setTimeout(() => {
      let aiResponse = '';

      // Generate mock responses based on keywords in the question
      if (userQuestion.toLowerCase().includes('uniswap')) {
        aiResponse =
          "Based on my analysis of Uniswap's governance forums, there are currently 3 active proposals:\n\n" +
          '1. UIP-23: Uniswap v4.1 Technical Improvements (84% approval)\n' +
          '2. UIP-24: Treasury Diversification Strategy (62% approval)\n' +
          '3. UIP-25: Grants Program Restructuring (91% approval)\n\n' +
          'The most discussed is UIP-23, with 87 comments focusing on gas optimization and security considerations. Would you like me to summarize any specific proposal in detail?';
      } else if (
        userQuestion.toLowerCase().includes('makerdao') ||
        userQuestion.toLowerCase().includes('treasury')
      ) {
        aiResponse =
          "MakerDAO's treasury management strategy has evolved significantly in the past year. They currently manage approximately $8.3B in assets with the following allocation:\n\n" +
          '- 45% stablecoins (primarily USDC)\n' +
          '- 28% ETH and liquid staking derivatives\n' +
          '- 15% tokenized real-world assets\n' +
          '- 8% DeFi protocol tokens\n' +
          '- 4% strategic investments\n\n' +
          'Their strategy highlights diversification, protocol-owned liquidity, and maintaining a minimum 30% allocation to stablecoins for operational expenses and risk management.';
      } else if (
        userQuestion.toLowerCase().includes('aave') ||
        userQuestion.toLowerCase().includes('risk')
      ) {
        aiResponse =
          "Aave's risk management framework consists of three primary components:\n\n" +
          "1. **Risk Parameters** - Each asset has specific parameters (LTV ratios, liquidation thresholds, and liquidation penalties) calibrated based on the asset's volatility and liquidity profile.\n\n" +
          '2. **Safety Module** - A staking system where AAVE token holders stake their tokens as insurance against shortfall events.\n\n' +
          '3. **Governance Oversight** - The Risk Committee regularly reviews markets and can propose parameter adjustments through the governance process.\n\n' +
          'This multi-layered approach has successfully protected the protocol through several market downturns.';
      } else if (
        userQuestion.toLowerCase().includes('trend') ||
        userQuestion.toLowerCase().includes('compare')
      ) {
        aiResponse =
          "Based on my analysis of governance data across major DAOs, I've identified these key trends over the past quarter:\n\n" +
          '1. **Increasing Delegate Diversity** - Most DAOs show a 15-20% increase in unique delegate addresses.\n\n' +
          '2. **Shorter Voting Periods** - Average voting window decreased from 7 days to 5.2 days.\n\n' +
          '3. **Rising Technical Proposal Complexity** - Proposals contain 35% more technical specifications.\n\n' +
          '4. **Greater Treasury Diversification** - 8 of 10 major DAOs have reduced their native token treasury holdings.\n\n' +
          '5. **More Formal Security Reviews** - 92% of protocol upgrade proposals now include third-party audits.';
      } else {
        aiResponse =
          "I've analyzed your question and found some relevant information across DAO governance forums and documentation. The topic you're asking about has been discussed in several contexts. Based on recent governance discussions, there are differing perspectives on this issue, with some prioritizing security while others focus on innovation and growth. Would you like me to provide more specific details on any particular aspect?";
      }

      const newAiMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      setChatHistory(prev => [...prev, newAiMessage]);
      setIsProcessing(false);
    }, 1500);
  };

  // Handle sending question on Enter key (but allow shift+enter for new lines)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Research Assistant</h1>
          <p className="text-muted-foreground">
            Ask questions about DAOs, governance, proposals, and trends
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[700px] flex flex-col">
              <CardHeader>
                <CardTitle>Chat with the AI Assistant</CardTitle>
                <CardDescription>Ask questions about DAO data and governance</CardDescription>
              </CardHeader>

              {/* Chat Messages */}
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className="text-xs mt-1 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div
                            className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '0.4s' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Input Area */}
              <CardFooter className="border-t pt-4">
                <div className="flex w-full space-x-2">
                  <textarea
                    value={userQuestion}
                    onChange={e => setUserQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about DAOs..."
                    className="flex-1 px-3 py-2 resize-none h-[80px] border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    onClick={sendQuestion}
                    disabled={isProcessing || !userQuestion.trim()}
                    className="h-[80px]"
                  >
                    Send
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Suggested Questions */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Suggested Questions</CardTitle>
                <CardDescription>Try asking one of these</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => {
                        setUserQuestion(question);
                      }}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Assistant Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Analyze governance proposals and voting patterns</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Summarize lengthy DAO discussions and forum threads</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Track treasury management strategies and token economics</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Identify trends across multiple DAOs and protocols</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Generate reports and visualizations from governance data</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  View Documentation
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
