import sys
import os
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models.models import User, AlarmThreshold, Product, Tank, Pump, Vessel
from app.core.security import get_password_hash


def clean_database():
    print("[INIT] Reajustando la base de datos a un estado LIMPIO para produccion...")

    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Delete operational & catalog data preserving structure
        db.execute(text("DELETE FROM alarm_events;"))
        db.execute(text("DELETE FROM measurements;"))
        db.execute(text("DELETE FROM scheduled_inspections;"))
        db.execute(text("DELETE FROM operation_pumps;"))
        db.execute(text("DELETE FROM operation_tanks;"))
        db.execute(text("DELETE FROM operations;"))
        db.execute(text("DELETE FROM tanks;"))
        db.execute(text("DELETE FROM pumps;"))
        db.execute(text("DELETE FROM vessels;"))
        db.execute(text("DELETE FROM products;"))
        db.execute(text("DELETE FROM audit_logs;"))
        db.execute(text("DELETE FROM alarm_thresholds;"))
        db.execute(text("DELETE FROM users;"))
        db.commit()

        # 1. Create Default Users
        mantenimiento_user = User(
            username="mantenimiento",
            hashed_password=get_password_hash("mantenimiento123"),
            full_name="Técnico de Mantenimiento",
            role="Mantenimiento",
            is_active=True
        )
        admin_user = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            full_name="Administrador del Sistema",
            role="Administrador",
            is_active=True
        )
        db.add(mantenimiento_user)
        db.add(admin_user)
        db.commit()

        # 2. Create Default Products
        p1 = Product(nombre="Aceite Vegetal", descripcion="Aceite vegetal de exportación")
        p2 = Product(nombre="Etanol", descripcion="Etanol industrial")
        db.add(p1)
        db.add(p2)
        db.commit()

        # 3. Create Default Vessel
        v1 = Vessel(nombre="Buque General Transferencia", empresa="Empresa Naviera")
        db.add(v1)
        db.commit()


        # 4. Create ALL 32 Official Plant Tanks
        official_tanks = [
            "TK-1A", "TK-2A", "TK-3A", "TK-4A", "TK-5A", "TK-6A", "TK-7A",
            "TK-1", "TK-2", "TK-3", "TK-4", "TK-5", "TK-7", "TK-8", "TK-9",
            "TK-10", "TK-11", "TK-12", "TK-14", "TK-15", "TK-16", "TK-17",
            "TK-18", "TK-19", "TK-20", "TK-21", "TK-22", "TK-23", "TK-24",
            "TK-25", "TK-26", "TK-27"
        ]
        for t_code in official_tanks:
            db.add(Tank(codigo=t_code, producto_id=p1.id))
        db.commit()

        # 5. Create Default Pumps
        default_pumps = [
            ("B101", "Bomba Principal B101"),
            ("B102", "Bomba Principal B102"),
            ("B103", "Bomba Auxiliar B103"),
        ]
        for p_code, p_name in default_pumps:
            db.add(Pump(codigo=p_code, nombre=p_name))
        db.commit()


        # 6. Create Global Alarm Threshold Default
        default_threshold = AlarmThreshold(
            bomba_id=None,
            temp_max_c=80.0,
            corriente_max_a=45.0,
            presion_suc_min_inhg=-10.0,
            presion_suc_max_inhg=30.0,
            presion_desc_min_psi=20.0,
            presion_desc_max_psi=150.0,
            is_active=True
        )
        db.add(default_threshold)
        db.commit()

        print("[OK] Base de datos configurada con los 32 tanques oficiales de la planta.")
        print("[OK] Usuarios creados: 'mantenimiento' / 'mantenimiento123' y 'admin' / 'admin123'")
        print("[OK] Bombas por defecto B101, B102, B103 creadas.")
        print("\n[LISTO] El sistema esta listo para iniciar operaciones sin configuraciones previas.")


    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error al limpiar la base de datos: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()

