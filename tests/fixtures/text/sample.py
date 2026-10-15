# コメント
def hello(name: str) -> str:
    return f"こんにちは {name}"

for i in range(3):
    print(hello("世界"), i)
