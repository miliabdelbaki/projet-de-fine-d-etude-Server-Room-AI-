import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(milliseconds: 800));

    if (!mounted) return;

    final token = await ApiService.getToken();

    if (token == null) {
      Navigator.pushReplacementNamed(context, '/login');
      return;
    }

    final user = await ApiService.getProfile();

    if (!mounted) return;

    if (user == null) {
      await ApiService.logout();
      Navigator.pushReplacementNamed(context, '/login');
      return;
    }

    final role = user["role"];

    print("ROLE: $role"); // DEBUG

    if (role == "employe") {
      Navigator.pushReplacementNamed(context, '/employee-home');
    } else if (role == "technicien") {
      Navigator.pushReplacementNamed(context, '/technician-home');
    } else {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF1E3A8A),
              Color(0xFF2563EB),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.engineering, size: 80, color: Colors.white),
              SizedBox(height: 24),
              Text(
                "TechVerif",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
              SizedBox(height: 40),
              CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2.5,
              ),
            ],
          ),
        ),
      ),
    );
  }
}