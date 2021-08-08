import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ImageBackground } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { VideoPlayer } from "./src/video-player/video-player";

const Stack = createStackNavigator();

const backgroundImage = require("./assets/images/background.jpg");

const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <ImageBackground
        source={backgroundImage}
        style={{
          height: "100%",
          width: "100%",
          resizeMode: "cover",
        }}
      >
        <NavigationContainer theme={DarkTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Root" component={VideoPlayer} />
          </Stack.Navigator>
        </NavigationContainer>
      </ImageBackground>
    </SafeAreaProvider>
  );
};

export default App;
