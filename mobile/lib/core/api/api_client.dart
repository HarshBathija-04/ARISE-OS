import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Thrown when the API returns `{ok: false, error}` or a transport failure.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

const _defaultBaseUrl = 'https://arise-os.onrender.com'; // Deployed backend.

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: _defaultBaseUrl,
);

/// Dio client for the Arise OS Express API.
///
/// - Attaches the Supabase access token as a Bearer header on every request.
/// - Unwraps the `{ok: true, ...data}` envelope; throws [ApiException] on
///   `{ok: false, error}` or transport errors.
class ApiClient {
  ApiClient({Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: apiBaseUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 20),
            )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token =
            Supabase.instance.client.auth.currentSession?.accessToken;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  final Dio _dio;

  Future<Map<String, dynamic>> get(String path,
      {Map<String, dynamic>? query}) async {
    return _request(() => _dio.get<dynamic>(path, queryParameters: query));
  }

  Future<Map<String, dynamic>> post(String path, {Object? body}) async {
    return _request(() => _dio.post<dynamic>(path, data: body));
  }

  Future<Map<String, dynamic>> put(String path, {Object? body}) async {
    return _request(() => _dio.put<dynamic>(path, data: body));
  }

  Future<Map<String, dynamic>> patch(String path, {Object? body}) async {
    return _request(() => _dio.patch<dynamic>(path, data: body));
  }

  Future<Map<String, dynamic>> delete(String path) async {
    return _request(() => _dio.delete<dynamic>(path));
  }

  Future<Map<String, dynamic>> _request(
      Future<Response<dynamic>> Function() send) async {
    Response<dynamic> res;
    try {
      res = await send();
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map<String, dynamic> && data['error'] != null) {
        throw ApiException(data['error'].toString(),
            statusCode: e.response?.statusCode);
      }
      throw ApiException(
        e.message ?? 'Network error — is the API reachable?',
        statusCode: e.response?.statusCode,
      );
    }
    return _unwrap(res);
  }

  Map<String, dynamic> _unwrap(Response<dynamic> res) {
    final data = res.data;
    if (data is! Map<String, dynamic>) {
      throw ApiException('Unexpected response shape',
          statusCode: res.statusCode);
    }
    if (data['ok'] == true) return data;
    throw ApiException(
      (data['error'] ?? 'Unknown API error').toString(),
      statusCode: res.statusCode,
    );
  }
}
