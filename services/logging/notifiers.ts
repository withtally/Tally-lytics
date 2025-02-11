import { LogMessage } from './types';

export const consoleNotifier = (message: LogMessage): void => {
  console.log(`[NOTIFICATION] ${message.level}: ${message.message}`);
};

export const smsNotifier =
  (phoneNumber: string) =>
  (message: LogMessage): void => {
    // Implement SMS sending logic here
    console.log(`Sending SMS to ${phoneNumber}: ${message.level} - ${message.message}`);
  };
