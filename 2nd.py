# logger.py

import datetime

LOG_FILE = "app.log"

def log_info(message):
    write_log("INFO", message)

def log_warning(message):
    write_log("WARNING", message)

def log_error(message):
    write_log("ERROR", message)

def write_log(level, message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_message = f"[{timestamp}] [{level}] {message}\n"
    
    with open(LOG_FILE, "a") as file:
        file.write(log_message)

def read_logs():
    try:
        with open(LOG_FILE, "r") as file:
            print(file.read())
    except FileNotFoundError:
        print("No logs found.")

# Example usage
if __name__ == "__main__":
    log_info("Application started")
    log_warning("Low memory detected")
    log_error("Failed to connect to database")

    print("\n---- Logs ----")
    read_logs()
