import sqlite3
import datetime
import json
import sys
import os
import hashlib
import random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db, get_db_connection

DOMAINS = [
    "google.com", "apple.com", "microsoft.com", "amazon.com", "meta.com", 
    "netflix.com", "tesla.com", "openai.com", "yahoo.com", "ibm.com",
    "oracle.com", "intel.com", "cisco.com", "salesforce.com", "adobe.com",
    "paypal.com", "twitter.com", "linkedin.com", "spotify.com", "uber.com",
    "airbnb.com", "github.com", "dropbox.com", "slack.com", "stripe.com", 
    "square.com", "zoom.us", "atlassian.com", "box.com", "example.com", "test.com"
]

FIRST_NAMES = ["james", "john", "robert", "michael", "william", "david", "richard", "joseph", "thomas", "charles", "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara", "susan", "jessica", "sarah", "karen", "alex", "chris", "ryan", "jordan", "samantha", "emily", "ashley", "amanda", "megan", "hannah"]
LAST_NAMES = ["smith", "johnson", "williams", "brown", "jones", "garcia", "miller", "davis", "rodriguez", "martinez", "hernandez", "lopez", "gonzalez", "wilson", "anderson", "thomas", "taylor", "moore", "jackson", "martin", "lee", "perez", "thompson", "white", "harris", "sanchez", "clark", "ramirez", "lewis", "robinson"]

BREACHES_METADATA = [
    {"name": "Equifax", "date": "2017-09-07", "severity": 10, "domains": ["equifax.com"], "compromised_data": ["Email", "Password", "SSN", "Names", "DOB"]},
    {"name": "LinkedIn", "date": "2012-05-05", "severity": 7, "domains": ["linkedin.com"], "compromised_data": ["Email", "Password", "Names", "Job Titles", "Employers"]},
    {"name": "Canva", "date": "2019-05-24", "severity": 6, "domains": ["canva.com"], "compromised_data": ["Email", "Password", "Names", "Locations"]},
    {"name": "Collection #1", "date": "2019-01-01", "severity": 9, "domains": [], "compromised_data": ["Email", "Password"]},
    {"name": "MySpace", "date": "2008-06-11", "severity": 5, "domains": ["myspace.com"], "compromised_data": ["Email", "Password", "Usernames"]},
    {"name": "Adobe", "date": "2013-10-01", "severity": 8, "domains": ["adobe.com"], "compromised_data": ["Email", "Password", "Password Hints", "Names"]},
    {"name": "Dropbox", "date": "2012-07-01", "severity": 6, "domains": ["dropbox.com"], "compromised_data": ["Email", "Password"]},
    {"name": "Yahoo", "date": "2013-08-01", "severity": 10, "domains": ["yahoo.com"], "compromised_data": ["Email", "Password", "Names", "DOB", "Phone Numbers"]},
    {"name": "Tumblr", "date": "2013-02-01", "severity": 5, "domains": ["tumblr.com"], "compromised_data": ["Email", "Password", "Usernames"]},
    {"name": "Evite", "date": "2019-04-01", "severity": 4, "domains": ["evite.com"], "compromised_data": ["Email", "Password", "Names", "DOB", "Phone Numbers", "Physical Address"]},
    {"name": "Zynga", "date": "2019-09-01", "severity": 6, "domains": ["zynga.com"], "compromised_data": ["Email", "Password", "Phone Numbers", "Usernames"]},
    {"name": "Under Armour", "date": "2018-02-01", "severity": 7, "domains": ["underarmour.com"], "compromised_data": ["Email", "Password", "Usernames"]},
    {"name": "Dubsmash", "date": "2018-12-01", "severity": 5, "domains": ["dubsmash.com"], "compromised_data": ["Email", "Password", "DOB", "Names", "Phone Numbers"]}
]

COMMON_PASSWORDS = [
    "password123", "qwerty", "admin", "123456", "iloveyou", "password", "12345678", "123456789", "12345", "1234567",
    "dragon", "letmein", "sunshine", "monkey", "charlie", "mustang", "shadow", "baseball", "football", "superman",
    "princess", "master", "welcome", "123123", "qazwsx", "654321", "123321", "111111", "hunter2", "ashley",
    "liverpool", "chelsea", "arsenal", "milan", "united", "city", "barcelona", "madrid", "bayern", "juventus",
    "honda", "toyota", "nissan", "ford", "chevy", "dodge", "bmw", "audi", "mercedes", "porsche"
]

# Generate more random numeric passwords
for i in range(200):
    COMMON_PASSWORDS.append(f"pass{random.randint(1000, 9999)}")
for i in range(100):
    COMMON_PASSWORDS.append(f"{random.randint(100000, 9999999)}")

def generate_emails(count=15000):
    emails = set()
    while len(emails) < count:
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        domain = random.choice(DOMAINS)
        
        # Mix of formats
        fmt = random.choice([
            f"{fn}.{ln}@{domain}",
            f"{fn[0]}{ln}@{domain}",
            f"{fn}{random.randint(1,99)}@{domain}",
            f"{ln}.{fn}@{domain}"
        ])
        emails.add(fmt)
    # Guarantee some test emails exist
    emails.update(["test@example.com", "exposed@example.com", "safe@example.com", "admin@google.com", "ceo@apple.com", "hr@microsoft.com", "sales@amazon.com", "dev@netflix.com"])
    return list(emails)

def seed_db():
    print("Initializing DB...")
    init_db()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("Clearing existing data...")
    cursor.execute("DELETE FROM user_breaches")
    cursor.execute("DELETE FROM breaches")
    cursor.execute("DELETE FROM users")
    cursor.execute("DELETE FROM leaked_passwords")
    
    print("Inserting breaches metadata...")
    breach_id_map = {}
    for breach in BREACHES_METADATA:
        cursor.execute('''
            INSERT INTO breaches (name, date, severity, domains, compromised_data)
            VALUES (?, ?, ?, ?, ?)
        ''', (breach["name"], breach["date"], breach["severity"], json.dumps(breach["domains"]), json.dumps(breach["compromised_data"])))
        breach_id_map[breach["name"]] = cursor.lastrowid
        
    print("Generating 15,000+ users and exposing 75% of them to random breaches...")
    emails = generate_emails(15000)
    
    user_batch = []
    user_breaches_batch = []
    
    for email in emails:
        cursor.execute("INSERT INTO users (email) VALUES (?)", (email,))
        user_id = cursor.lastrowid
        
        # 75% chance of being in at least one breach
        if email != "safe@example.com" and random.random() < 0.75:
            num_breaches = random.randint(1, 8)
            exposed_in = random.sample(BREACHES_METADATA, min(num_breaches, len(BREACHES_METADATA)))
            for breach in exposed_in:
                user_breaches_batch.append((user_id, breach_id_map[breach["name"]]))
                
    cursor.executemany("INSERT INTO user_breaches (user_id, breach_id) VALUES (?, ?)", user_breaches_batch)
            
    print("Hashing and inserting leaked passwords for k-Anonymity checks...")
    password_batch = []
    for pwd in COMMON_PASSWORDS:
        count = random.randint(500, 5000000)
        sha1 = hashlib.sha1(pwd.encode('utf-8')).hexdigest().upper()
        prefix = sha1[:5]
        suffix = sha1[5:]
        password_batch.append((prefix, suffix, count))
        
    cursor.executemany('''
        INSERT OR IGNORE INTO leaked_passwords (hash_prefix, hash_suffix, count)
        VALUES (?, ?, ?)
    ''', password_batch)
            
    conn.commit()
    conn.close()
    
    print(f"✅ Successfully inserted {len(emails)} user records with {len(user_breaches_batch)} exposures!")
    print(f"✅ Inserted {len(COMMON_PASSWORDS)} leaked passwords!")

if __name__ == "__main__":
    seed_db()