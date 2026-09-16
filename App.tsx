import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FontProvider } from './src/design/fonts';
import { RootNavigator } from './src/navigation/RootNavigator';
import { migrateChatData } from './src/storage/migrateChatData';

export default function App() {
  // One-time: brings the old Chat to-dos and notes into tasks and the journal.
  useEffect(() => {
    migrateChatData();
  }, []);

  return (
    <SafeAreaProvider>
      <FontProvider>
        <RootNavigator />
      </FontProvider>
    </SafeAreaProvider>
  );
}
