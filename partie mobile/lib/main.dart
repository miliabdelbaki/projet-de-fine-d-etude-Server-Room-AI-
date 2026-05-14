import 'package:flutter/material.dart';

// Screens
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/interventions_home_screen.dart';
import 'screens/intervention_detail_screen.dart';
import 'screens/room_details_screen.dart';
import 'screens/verification_screen.dart';
import 'screens/history_screen.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Technicien App',
      theme: ThemeData(primarySwatch: Colors.blue),

      initialRoute: '/',

      routes: {
        '/': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),

        // MAIN FLOW


        // DETAILS
        '/intervention-detail': (context) => const InterventionDetailScreen(),
        '/room': (context) => const RoomDetailsScreen(),
        '/verification': (context) => const VerificationScreen(),
        '/history': (context) => const HistoryScreen(),
        '/employee-home': (context) => const HomeScreen(),
        '/technician-home': (context) => const InterventionsHomeScreen(),
      },
    );
  }
}