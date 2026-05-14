import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  late Map<String, dynamic> verification;
  bool loading = false;
  final picker = ImagePicker();
  final Set<int> uploadingPhotos = {};
  final Map<int, TextEditingController> controllers = {};
  bool initialized = false;

  TextEditingController getController(int index, String text) {
    if (!controllers.containsKey(index)) {
      controllers[index] = TextEditingController(text: text);
    }
    return controllers[index]!;
  }

  @override
  void dispose() {
    for (var c in controllers.values) c.dispose();
    super.dispose();
  }

  Map<String, dynamic> normalizeItem(dynamic item) {
    final map = Map<String, dynamic>.from(item);
    map['completed'] = map['completed'] == true || map['completed'] == 'true';
    map['label'] = map['label']?.toString() ?? '';
    map['notes'] = map['notes']?.toString() ?? '';
    map['photo'] = map['photo']?.toString();
    return map;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (!initialized) {
      final args = ModalRoute.of(context)?.settings.arguments;

      if (args == null || args is! Map) {
        print("❌ ERREUR: arguments invalides → $args");

        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Erreur: données invalides")),
          );
        });

        return;
      }

      verification = Map<String, dynamic>.from(args);

      final raw = verification['items'];

      verification['items'] = raw is List
          ? raw.map((e) => normalizeItem(e)).toList()
          : [];

      initialized = true;
    }
  }

  List<Map<String, dynamic>> get items =>
      List<Map<String, dynamic>>.from(verification['items']);

  int get completedCount => items.where((i) => i['completed'] == true).length;
  double get progress => items.isEmpty ? 0 : completedCount / items.length;

  Future<void> toggleItem(int index, bool value) async {
    setState(() => verification['items'][index]['completed'] = value);
    await ApiService.updateItem(verification['_id'].toString(), index, value);
  }

  Future<void> addComment(int index, String comment) async {
    setState(() {
      verification['items'][index]['notes'] = comment;
      verification['items'][index]['comment'] = comment;
    });
    await ApiService.updateItem(
      verification['_id'].toString(),
      index,
      verification['items'][index]['completed'] ?? false,
      comment: comment,
    );
  }

  Future<void> addPhoto(int index) async {
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 50,
      maxWidth: 800,
      maxHeight: 800,
    );
    if (picked == null) return;

    setState(() => uploadingPhotos.add(index));
    try {
      final bytes = await File(picked.path).readAsBytes();
      final base64Image = base64Encode(bytes);
      final success = await ApiService.updateItem(
        verification['_id'].toString(),
        index,
        true,
        photo: base64Image,
      );
      if (success) {
        setState(() {
          verification['items'][index]['photo'] = base64Image;
          verification['items'][index]['completed'] = true;
        });
      }
    } finally {
      setState(() => uploadingPhotos.remove(index));
    }
  }

  Future<void> submit() async {
    setState(() => loading = true);
    final result = await ApiService.submitVerification(
      verification['_id'].toString(),
      verification['items'],
    );
    setState(() => loading = false);
    if (result == true) {
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/employee-home',
            (route) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentItems = items;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A2744),
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Checklist',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
      ),
      body: Column(
        children: [
          // ── Progress bar ──
          Container(
            color: const Color(0xFFF8FAFC),
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Progression : $completedCount / ${currentItems.length}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                    backgroundColor: const Color(0xFFE2E8F0),
                    valueColor: const AlwaysStoppedAnimation(Color(0xFF22C55E)),
                  ),
                ),
              ],
            ),
          ),

          // ── Items list ──
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              itemCount: currentItems.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = currentItems[index];
                final isUploading = uploadingPhotos.contains(index);
                final photoData = item['photo'] as String?;
                final isCompleted = item['completed'] == true;

                return Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFFE2E8F0),
                      width: 0.5,
                    ),
                  ),
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Label + checkbox row
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () => toggleItem(index, !isCompleted),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                color: isCompleted
                                    ? const Color(0xFF22C55E)
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(5),
                                border: Border.all(
                                  color: isCompleted
                                      ? const Color(0xFF22C55E)
                                      : const Color(0xFFCBD5E1),
                                  width: 1.5,
                                ),
                              ),
                              child: isCompleted
                                  ? const Icon(Icons.check,
                                  size: 13, color: Colors.white)
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            item['label'],
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // Comment field
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Commentaire',
                            style: TextStyle(
                              fontSize: 10,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                          const SizedBox(height: 3),
                          TextField(
                            controller: getController(
                                index, item['notes'] ?? ''),
                            onChanged: (v) => addComment(index, v),
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF334155),
                            ),
                            decoration: InputDecoration(
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 8),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                    color: Color(0xFFE2E8F0), width: 1),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                    color: Color(0xFF93C5FD), width: 1.5),
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // Camera button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: isUploading ? null : () => addPhoto(index),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF166534),
                            foregroundColor: const Color(0xFF86EFAC),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          icon: isUploading
                              ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Color(0xFF86EFAC),
                            ),
                          )
                              : const Icon(Icons.camera_alt_outlined, size: 16),
                          label: Text(
                            isUploading ? 'Envoi...' : 'Changer la photo',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),

                      // Photo preview
                      if (photoData != null && photoData.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.memory(
                                base64Decode(photoData),
                                width: double.infinity,
                                height: 80,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 6,
                              right: 6,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF16A34A),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Icon(Icons.check,
                                        size: 10, color: Color(0xFFBBF7D0)),
                                    SizedBox(width: 3),
                                    Text(
                                      'Enregistrée',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFFBBF7D0),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),

      // ── Submit button ──
      bottomNavigationBar: Container(
        color: const Color(0xFFF8FAFC),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            onPressed: loading ? null : submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1A2744),
              foregroundColor: const Color(0xFFE2E8F0),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            icon: loading
                ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
                : const Icon(Icons.arrow_forward_rounded, size: 18),
            label: loading
                ? const SizedBox.shrink()
                : const Text(
              'Soumettre la vérification',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }
}