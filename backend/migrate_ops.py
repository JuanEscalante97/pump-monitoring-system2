import sys
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Add the parent directory to sys.path so 'app' can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.models import Operation

def migrate():
    db = SessionLocal()
    try:
        # Fetch all operations ordered by creation date
        operations = db.query(Operation).order_by(Operation.created_at.asc()).all()
        for idx, op in enumerate(operations):
            new_code = f"OP-{(idx + 1):03d}"
            print(f"Updating {op.codigo_operacion} -> {new_code}")
            op.codigo_operacion = new_code
        db.commit()
        print("Migration complete.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
