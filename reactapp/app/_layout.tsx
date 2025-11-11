import { Stack } from "expo-router";
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="workout-detail/index" />
        <Stack.Screen name="workout-detail/[id]" />
        <Stack.Screen name="create-workout" />
        <Stack.Screen name="edit-workout/[id]" />
      </Stack>
      <Toast 
        config={{
          success: (props) => (
            <View style={{
              height: 60,
              width: '90%',
              backgroundColor: '#155724',
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              elevation: 1000,
              zIndex: 1000,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                  {props.text1}
                </Text>
                {props.text2 && (
                  <Text style={{ color: 'white', fontSize: 12, opacity: 0.9 }}>
                    {props.text2}
                  </Text>
                )}
              </View>
            </View>
          ),
          info: (props) => (
            <View style={{
              height: 60,
              width: '90%',
              backgroundColor: '#17a2b8',
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              elevation: 1000,
              zIndex: 1000,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                  {props.text1}
                </Text>
                {props.text2 && (
                  <Text style={{ color: 'white', fontSize: 12, opacity: 0.9 }}>
                    {props.text2}
                  </Text>
                )}
              </View>
            </View>
          ),
          error: (props) => (
            <View style={{
              height: 60,
              width: '90%',
              backgroundColor: '#e74c3c',
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              elevation: 1000,
              zIndex: 1000,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                  {props.text1}
                </Text>
                {props.text2 && (
                  <Text style={{ color: 'white', fontSize: 12, opacity: 0.9 }}>
                    {props.text2}
                  </Text>
                )}
              </View>
            </View>
          ),
        }}
        position="top" 
        topOffset={insets.top + 10}
      />
    </GestureHandlerRootView>
  );
}
