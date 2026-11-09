from .models import Profile


def match_score(me: Profile, other: Profile) -> int:
    """Simple 0-100 compatibility: age, city, denomination, education."""
    score = 0
    gap = abs(me.age - other.age)
    score += max(0, 30 - gap * 5)                                   # age proximity (30)
    score += 20 if me.city.lower() == other.city.lower() else 0     # location (20)
    score += 35 if me.denomination.lower() == other.denomination.lower() else 10  # faith (35)
    score += 15 if me.education and me.education.lower() == other.education.lower() else 5  # education (15)
    return min(score, 100)
