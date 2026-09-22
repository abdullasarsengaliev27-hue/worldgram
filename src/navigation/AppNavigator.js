import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import CallScreen from '../screens/CallScreen';
import SummaryScreen from '../screens/SummaryScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import FriendsMapScreen from '../screens/FriendsMapScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TranslateScreen from '../screens/TranslateScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import StoriesScreen from '../screens/StoriesScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TermsScreen from '../screens/TermsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import CallSummariesScreen from '../screens/CallSummariesScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import ChatBackgroundScreen from '../screens/ChatBackgroundScreen';
import ContactsScreen from '../screens/ContactsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: '#0A0A0F',
          borderTopColor: '#1A1A2E',
          height: 65,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#555',
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Чаты' }}
      />
      <Tab.Screen
        name="Map"
        component={FriendsMapScreen}
        options={{ tabBarLabel: 'Карта' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Профиль' }}
      />
      <Tab.Screen
  name="Contacts"
  component={ContactsScreen}
  options={{
    tabBarLabel: 'Контакты',
    tabBarIcon: ({ focused, color, size }) => (
      <Ionicons
        name={focused ? 'people' : 'people-outline'}
        size={size} color={color}
      />
    ),
  }}
/>
    </Tab.Navigator>

    
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Call" component={CallScreen} />
        <Stack.Screen name="Summary" component={SummaryScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Translate" component={TranslateScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="Stories" component={StoriesScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
<Stack.Screen name="Terms" component={TermsScreen} />
<Stack.Screen name="UserProfile" component={UserProfileScreen} />
<Stack.Screen name="Settings" component={SettingsScreen} />
<Stack.Screen name="Help" component={HelpScreen} />
<Stack.Screen name="CallSummaries" component={CallSummariesScreen} />
<Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
<Stack.Screen name="ChatBackground" component={ChatBackgroundScreen} />
<Stack.Screen name="Contacts" component={ContactsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
