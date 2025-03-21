from server.main import app

# Vercel은 이 'app' 객체를 사용하여 엔드포인트를 처리합니다
# 특별한 설정이 필요한 경우 여기에 추가할 수 있습니다

# Vercel 서버리스 함수를 위한 WSGI 핸들러
def handler(request, **kwargs):
    def start_response(status, headers, exc_info=None):
        return [status, headers, []]
    return app(request.environ, start_response)

# 프로덕션 환경에서는 디버그 모드 비활성화
app.debug = False

# 이 변수는 Vercel이 HTTP 요청을 처리하기 위해 사용합니다
app = app
