def calculate_risk_score(breaches: list) -> int:
    """
    Calculates a risk score from 0 to 100 based on the severity and number of breaches.
    """
    if not breaches:
        return 0
    
    # Base calculation
    total_severity = sum(breach.get('severity', 0) if isinstance(breach, dict) else breach.severity for breach in breaches)
    
    # Weight the number of breaches
    num_breaches = len(breaches)
    
    score = (total_severity * 5) + (num_breaches * 10)
    
    # Cap at 100
    return min(100, score)

def generate_playbook(breaches: list) -> list:
    """
    Generates dynamic mitigation recommendations based on compromised data in breaches.
    """
    recommendations = set()
    for breach in breaches:
        # breach is a dict, compromised_data could be a list of strings
        data_types = breach.get('compromised_data', [])
        if isinstance(data_types, str):
            import json
            try:
                data_types = json.loads(data_types)
            except:
                data_types = []

        # Convert to lowercase for easier matching
        data_types = [str(dt).lower() for dt in data_types]

        if any('ssn' in dt for dt in data_types) or any('social security' in dt for dt in data_types):
            recommendations.add("Freeze Credit")
        if any('password' in dt for dt in data_types):
            recommendations.add("Change Passwords and Enable 2FA")
        if any('email' in dt for dt in data_types):
            recommendations.add("Monitor Email for Phishing")
        if any('dob' in dt or 'date of birth' in dt for dt in data_types):
            recommendations.add("Monitor Identity Theft Risks")

    # Default recommendation if exposed
    if breaches and not recommendations:
        recommendations.add("Review Account Security Settings")
        
    return list(recommendations)
