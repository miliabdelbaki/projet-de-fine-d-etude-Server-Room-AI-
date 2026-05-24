import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = "https://projet-de-fine-d-etude-server-room-ai.onrender.com/api";
  static const Duration requestTimeout = Duration(seconds: 60);

  // ================= TOKEN =================
  static Future<Map<String, dynamic>?> getProfile() async {
    try {
      final token = await getToken();

      if (token == null) return null;

      final response = await http.get(
        Uri.parse("$baseUrl/auth/me"),
        headers: {
          "Authorization": "Bearer $token",
        },
      );

      print("PROFILE STATUS: ${response.statusCode}");
      print("PROFILE BODY: ${response.body}");

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }

      return null;
    } catch (e) {
      print("getProfile error: $e");
      return null;
    }
  }
  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString("token", token);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString("token");
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove("token");
  }

  /// Vérifie si le token JWT est expiré côté client
  static bool _isTokenExpired(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return true;

      // Padding base64
      String payload = parts[1];
      switch (payload.length % 4) {
        case 2:
          payload += '==';
          break;
        case 3:
          payload += '=';
          break;
      }

      final decoded = jsonDecode(
        utf8.decode(base64Url.decode(payload)),
      );
      final exp = decoded['exp'];
      if (exp == null) return false;

      final expDate = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      return DateTime.now().isAfter(expDate);
    } catch (_) {
      return true;
    }
  }

  /// Retourne le token s'il est valide, sinon null
  static Future<String?> _getValidToken() async {
    final token = await getToken();
    if (token == null || token.isEmpty) return null;
    if (_isTokenExpired(token)) {
      await logout();
      return null;
    }
    return token;
  }

  // ================= LOGIN =================

  static Future<dynamic> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse("$baseUrl/auth/login"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "email": email,
          "password": password,

        }),
      ).timeout(requestTimeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        final token = data["token"];
        if (token == null || token.toString().isEmpty) {
          return "Token absent dans la réponse";
        }
        await saveToken(token.toString());
        return data["user"];
      } else {
        return data["message"] ?? "Erreur de connexion";
      }
    } catch (e) {
      return "Serveur indisponible";
    }
  }
  // ================= CHECK TOKEN =================

  static Future<bool> checkMe() async {
    final token = await _getValidToken();
    if (token == null) return false;

    try {
      final response = await http
          .get(
        Uri.parse("$baseUrl/auth/me"),
        headers: {"Authorization": "Bearer $token"},
      )
          .timeout(requestTimeout);

      if (response.statusCode == 401) {
        await logout();
        return false;
      }
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ================= REGISTER =================

  static Future<dynamic> register(
      String email,
      String password,
      String name,
      String role, // ajouté
      ) async {
    try {
      final response = await http.post(
        Uri.parse("$baseUrl/auth/register"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "email": email,
          "password": password,
          "displayName": name,
          "role": role, //  dynamique
        }),
      ).timeout(requestTimeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      } else {
        return data["message"] ?? "Erreur d'inscription";
      }
    } catch (e) {
      return "Serveur indisponible";
    }
  }

  // ================= ROOMS =================

  static Future<List> getMyRooms() async {
    final token = await _getValidToken();
    if (token == null) return [];

    try {
      final response = await http
          .get(
        Uri.parse("$baseUrl/rooms"),
        headers: {"Authorization": "Bearer $token"},
      )
          .timeout(requestTimeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data["rooms"] != null) return data["rooms"];
        return [];
      } else if (response.statusCode == 401) {
        await logout();
        return [];
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  // ================= START VERIFICATION =================

  static Future<dynamic> startVerification(String roomId) async {
    final token = await _getValidToken();

    if (token == null) {
      return {
        "error": "unauthorized",
        "message": "Session expirée, veuillez vous reconnecter",
      };
    }

    try {
      final url = "$baseUrl/verifications/rooms/$roomId/start-verification";

      //  FIX: POST sans body — évite le crash 500 sur certains backends Express
      final response = await http
          .post(
        Uri.parse(url),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      )
          .timeout(requestTimeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await logout();
        return {
          "error": "unauthorized",
          "message": "Session expirée, veuillez vous reconnecter",
        };
      } else if (response.statusCode == 500) {
        // Essai de fallback avec body vide explicite
        final fallback = await http
            .post(
          Uri.parse(url),
          headers: {
            "Authorization": "Bearer $token",
            "Content-Type": "application/json",
          },
          body: '{}',
        )
            .timeout(requestTimeout);

        if (fallback.statusCode == 200 || fallback.statusCode == 201) {
          return jsonDecode(fallback.body);
        }

        final errData = jsonDecode(response.body);
        return {
          "error": "server_error",
          "message": errData["message"] ?? "Erreur serveur (500)",
        };
      } else {
        final errData = jsonDecode(response.body);
        return {
          "error": "error_${response.statusCode}",
          "message":
          errData["message"] ?? "Erreur ${response.statusCode}",
        };
      }
    } catch (e) {
      return {
        "error": "network_error",
        "message": "Serveur indisponible",
      };
    }
  }

  // ================= UPDATE ITEM =================

  static Future<bool> updateItem(
      String verificationId,
      int index,
      bool completed, {
        String? photo,
        String? comment,
      }) async {
    final token = await _getValidToken();
    if (token == null) return false;

    final String? cleanPhoto = photo != null && photo.isNotEmpty
        ? photo.replaceFirst(RegExp(r'^data:[^;]+;base64,'), '')
        : null;

    final body = {
      "completed": completed,
      if (cleanPhoto != null && cleanPhoto.isNotEmpty) "photo": cleanPhoto,
      if (comment != null) "notes": comment,
    };

    try {
      final response = await http
          .put(
        Uri.parse(
            "$baseUrl/verifications/$verificationId/items/$index"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode(body),
      )
          .timeout(requestTimeout);

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ================= SUBMIT VERIFICATION =================

  static Future<dynamic> submitVerification(
      String verificationId,
      List<dynamic> items,
      ) async {
    // Vérifie que toutes les photos sont présentes
    for (int i = 0; i < items.length; i++) {
      final photo = items[i]["photo"];
      if (photo == null || photo.toString().trim().isEmpty) {
        return "Photo manquante pour l'élément ${i + 1}";
      }
    }

    final token = await _getValidToken();
    if (token == null) {
      return "Session expirée, veuillez vous reconnecter";
    }

    try {
      final response = await http
          .put(
        Uri.parse("$baseUrl/verifications/$verificationId/submit"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({}),
      )
          .timeout(requestTimeout);

      if (response.statusCode == 200) {
        return true;
      } else if (response.statusCode == 401) {
        await logout();
        return "Session expirée, veuillez vous reconnecter";
      } else {
        final data = jsonDecode(response.body);
        return data["message"] ?? "Erreur serveur (${response.statusCode})";
      }
    } catch (e) {
      return "Serveur indisponible";
    }
  }
// ================= INTERVENTIONS =================

  /// Récupère toutes les interventions assignées au technicien connecté
  static Future<List> getMyInterventions() async {
    final token = await _getValidToken();
    if (token == null) return [];

    try {
      final response = await http.get(
        Uri.parse("$baseUrl/technician/interventions"),
        headers: {"Authorization": "Bearer $token"},
      ).timeout(requestTimeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        return [];
      } else if (response.statusCode == 401) {
        await logout();
        return [];
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  /// Récupère les détails d'une intervention (avec photos de la vérification)
  static Future<Map<String, dynamic>?> getInterventionDetail(String noteId) async {
    final token = await _getValidToken();
    if (token == null) return null;

    try {
      final response = await http.get(
        Uri.parse("$baseUrl/technician/interventions/$noteId"),
        headers: {"Authorization": "Bearer $token"},
      ).timeout(requestTimeout);

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  /// Met à jour le statut d'une intervention
  /// [status] doit être 'EN_ATTENTE', 'EN_COURS', ou 'TERMINEE'
  static Future<dynamic> updateInterventionStatus(
      String noteId,
      String status, {
        String? feedback,
      }) async {
    final token = await _getValidToken();
    if (token == null) return "Session expirée";

    try {
      final body = {
        "status": status,
        if (feedback != null && feedback.isNotEmpty) "feedback": feedback,
      };

      final response = await http.put(
        Uri.parse("$baseUrl/technician/interventions/$noteId/status"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode(body),
      ).timeout(requestTimeout);

      if (response.statusCode == 200) return true;

      final data = jsonDecode(response.body);
      return data["message"] ?? "Erreur serveur (${response.statusCode})";
    } catch (e) {
      return "Serveur indisponible";
    }
  }
  // ================= HISTORY =================

  static Future<List> getHistory() async {
    final token = await _getValidToken();
    if (token == null) return [];

    try {
      final response = await http
          .get(
        Uri.parse("$baseUrl/verifications/history"),
        headers: {"Authorization": "Bearer $token"},
      )
          .timeout(requestTimeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data["items"] != null) return data["items"];
        if (data["verifications"] != null) return data["verifications"];
        return [];
      } else if (response.statusCode == 401) {
        await logout();
        return [];
      }
    } catch (e) {
      // ignore
    }
    return [];
  }
}
