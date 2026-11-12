import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=131072, r=8, p=1, dklen=64, maxmem=256 * 1024 * 1024
    )
    return f"scrypt$131072$8$1${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if stored is None:
        hash_password(password)
        return False
    try:
        algorithm, n, r, p, salt, expected = stored.split("$")
        if algorithm != "scrypt" or n not in {"16384", "131072"} or (r, p) != ("8", "1"):
            return False
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=bytes.fromhex(salt),
            n=int(n),
            r=8,
            p=1,
            dklen=64,
            maxmem=256 * 1024 * 1024,
        )
        return hmac.compare_digest(actual.hex(), expected)
    except ValueError, TypeError:
        return False


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
