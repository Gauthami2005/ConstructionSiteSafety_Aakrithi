# auth.py

import hashlib

# Simple in-memory user database
users_db = {}

def hash_password(password):
    """Hash the password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def register(username, password):
    """Register a new user"""
    if username in users_db:
        print("User already exists!")
        return False
    
    hashed = hash_password(password)
    users_db[username] = hashed
    print("Registration successful!")
    return True

def login(username, password):
    """Authenticate user"""
    if username not in users_db:
        print("User not found!")
        return False
    
    hashed = hash_password(password)
    
    if users_db[username] == hashed:
        print("Login successful!")
        return True
    else:
        print("Invalid password!")
        return False


def main():
    while True:
        print("\n1. Register")
        print("2. Login")
        print("3. Exit")

        choice = input("Enter choice: ")

        if choice == "1":
            username = input("Username: ")
            password = input("Password: ")
            register(username, password)

        elif choice == "2":
            username = input("Username: ")
            password = input("Password: ")
            login(username, password)

        elif choice == "3":
            print("Exiting...")
            break

        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
