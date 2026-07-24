import sys
import os
from datetime import datetime, date, time, timedelta, timezone

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models.models import User, Product, Tank, Pump, Vessel, AlarmThreshold, Operation, ScheduledInspection, Measurement, AlarmEvent
from app.core.security import get_password_hash

def seed():
    print("Iniciando sembrado de datos de prueba...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Users
        mantenimiento_user = db.query(User).filter(User.username == "mantenimiento").first()
        if not mantenimiento_user:
            mantenimiento_user = User(
                username="mantenimiento",
                hashed_password=get_password_hash("mantenimiento123"),
                full_name="Carlos Rodríguez (Técnico Mantenimiento)",
                role="Mantenimiento",
                is_active=True
            )
            db.add(mantenimiento_user)

        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                full_name="Ing. Alejandro Gómez (Jefe Mantenimiento)",
                role="Administrador",
                is_active=True
            )
            db.add(admin_user)

        db.commit()
        db.refresh(mantenimiento_user)
        db.refresh(admin_user)
        print("✔ Usuarios creados: 'mantenimiento' / 'mantenimiento123' y 'admin' / 'admin123'")

        # 2. Products
        p1 = db.query(Product).filter(Product.nombre == "Aceite Vegetal").first()
        if not p1:
            p1 = Product(nombre="Aceite Vegetal", descripcion="Aceite crudo de soya y palma para exportación", densidad=0.92, viscosidad=45.0)
            db.add(p1)

        p2 = db.query(Product).filter(Product.nombre == "Etanol").first()
        if not p2:
            p2 = Product(nombre="Etanol", descripcion="Etanol anhidro industrial 99.5%", densidad=0.789, viscosidad=1.2)
            db.add(p2)

        db.commit()
        db.refresh(p1)
        db.refresh(p2)
        print("✔ Productos creados: Aceite Vegetal, Etanol")

        # 3. Tanks
        tanks_data = [
            ("TK3", p1.id, 5000.0, "Disponible"),
            ("TK4", p1.id, 5000.0, "En Uso"),
            ("TK5", p2.id, 3500.0, "Disponible"),
            ("TK6", p2.id, 3500.0, "En Uso")
        ]
        created_tanks = []
        for code, pid, cap, st in tanks_data:
            t = db.query(Tank).filter(Tank.codigo == code).first()
            if not t:
                t = Tank(codigo=code, producto_id=pid, capacidad_m3=cap, estado=st)
                db.add(t)
            created_tanks.append(t)
        db.commit()
        print("✔ Tanques creados: TK3, TK4, TK5, TK6")

        # 4. Pumps
        pumps_data = [
            ("B101", "Bomba Principal Transferencia A", "Sulzer", "ZE 80-250", 250.0, "Motor IEC 75 HP 440V", 55.0),
            ("B102", "Bomba Principal Transferencia B", "Sulzer", "ZE 80-250", 250.0, "Motor IEC 75 HP 440V", 55.0),
            ("B103", "Bomba de Refuerzo Auxiliar", "Flowserve", "Mark 3 3x2-13", 180.0, "Motor NEMA 50 HP 440V", 37.0),
            ("B104", "Bomba Standby Reserva", "Kirloskar", "DB 100/26", 200.0, "Motor 60 HP 440V", 45.0),
        ]
        created_pumps = []
        for code, name, marca, model, caudal, motor, pot in pumps_data:
            p = db.query(Pump).filter(Pump.codigo == code).first()
            if not p:
                p = Pump(codigo=code, nombre=name, marca=marca, modelo=model, caudal_nominal_m3h=caudal, motor_info=motor, potencia_kw=pot, estado="Operativa")
                db.add(p)
            created_pumps.append(p)
        db.commit()
        print("✔ Bombas creadas: B101, B102, B103, B104")

        # 5. Vessels
        v1 = db.query(Vessel).filter(Vessel.nombre == "MV Northern Star").first()
        if not v1:
            v1 = Vessel(nombre="MV Northern Star", empresa="Stena Bulk Lines", observaciones="Tanquero de 35,000 DWT para exportación de aceite")
            db.add(v1)

        v2 = db.query(Vessel).filter(Vessel.nombre == "MV Pacific Transport").first()
        if not v2:
            v2 = Vessel(nombre="MV Pacific Transport", empresa="Mitsui O.S.K. Lines", observaciones="Embarcación especializada en granel líquido")
            db.add(v2)

        db.commit()
        db.refresh(v1)
        db.refresh(v2)
        print("✔ Buques creados: MV Northern Star, MV Pacific Transport")

        # 6. Global Alarm Threshold
        th = db.query(AlarmThreshold).filter(AlarmThreshold.bomba_id == None).first()
        if not th:
            th = AlarmThreshold(
                bomba_id=None,
                temp_max_c=80.0,
                corriente_max_a=45.0,
                presion_suc_min_inhg=-10.0,
                presion_suc_max_inhg=30.0,
                presion_desc_min_psi=20.0,
                presion_desc_max_psi=150.0,
                is_active=True
            )
            db.add(th)
            db.commit()
        print("✔ Umbral global de alarmas configurado (Temp > 80°C, Corriente > 45 A)")

        # 7. Initial Active Operation & Sample Measurements
        active_op = db.query(Operation).filter(Operation.estado == "Activa").first()
        if not active_op:
            now_dt = datetime.now()
            active_op = Operation(
                codigo_operacion=f"OP-{now_dt.strftime('%Y%m%d')}-001",
                fecha=now_dt.date(),
                buque_id=v1.id,
                producto_id=p1.id,
                responsable_id=mantenimiento_user.id,
                hora_inicio=time(8, 0),
                estado="Activa",
                observaciones="Transferencia de Aceite Vegetal a buque MV Northern Star",
                tanks=[created_tanks[0], created_tanks[1]], # TK3, TK4
                pumps=[created_pumps[0], created_pumps[1]]  # B101, B102
            )
            db.add(active_op)
            db.commit()
            db.refresh(active_op)

            # Update pumps to "En Operacion"
            created_pumps[0].estado = "En Operacion"
            created_pumps[1].estado = "En Operacion"

            # Create scheduled hourly inspections
            start_h = time(8, 0)
            for i in range(1, 8):
                h_slot = time((8 + i) % 24, 0)
                insp = ScheduledInspection(
                    operation_id=active_op.id,
                    hora_programada=h_slot,
                    estado="A tiempo" if i <= 3 else "Pendiente",
                    retraso_minutos=0 if i <= 3 else 0
                )
                db.add(insp)
            db.commit()

            # Create realistic initial historical measurements
            sample_measurements = [
                (time(9, 2), created_pumps[0].id, 4.5, 82.0, 62.5, 34.2, "Bomba B101 operando suave"),
                (time(9, 5), created_pumps[1].id, 4.8, 84.5, 64.0, 35.1, "Bomba B102 en carga nominal"),
                (time(10, 1), created_pumps[0].id, 4.6, 83.0, 68.0, 36.5, "Aumento leve de temperatura ambiente"),
                (time(10, 4), created_pumps[1].id, 4.9, 85.0, 71.5, 38.0, "Parámetros estables"),
                (time(11, 0), created_pumps[0].id, 4.4, 81.5, 78.5, 42.1, "Alerta preventiva por vibración leve"),
                (time(11, 3), created_pumps[1].id, 5.1, 86.2, 82.4, 47.5, "Pico de corriente por incremento de viscosidad") # Triggering Alarm!
            ]

            for h_reg, pump_id, p_suc, p_desc, temp, corr, obs in sample_measurements:
                dt_reg = datetime.combine(now_dt.date(), h_reg)
                m = Measurement(
                    operation_id=active_op.id,
                    bomba_id=pump_id,
                    presion_succion_inhg=p_suc,
                    presion_descarga_psi=p_desc,
                    temperatura_c=temp,
                    corriente_a=corr,
                    observaciones=obs,
                    registrado_por_id=mantenimiento_user.id,
                    fecha_registro=now_dt.date(),
                    hora_registro=h_reg,
                    datetime_registro=dt_reg,
                    is_corrected=False
                )
                db.add(m)
                db.commit()
                db.refresh(m)

                # Check alarm trigger
                if temp > 80.0:
                    db.add(AlarmEvent(
                        measurement_id=m.id, bomba_id=pump_id, operacion_id=active_op.id,
                        tipo_alarma="Alta Temperatura Motor", nivel="ALARM",
                        mensaje=f"¡CRÍTICO! Temperatura excede límite ({temp}°C > 80°C)",
                        valor_registrado=temp, limite_umbral=80.0, estado="Activa"
                    ))
                if corr > 45.0:
                    db.add(AlarmEvent(
                        measurement_id=m.id, bomba_id=pump_id, operacion_id=active_op.id,
                        tipo_alarma="Alta Corriente Motor", nivel="ALARM",
                        mensaje=f"¡ADVERTENCIA! Corriente excede límite ({corr} A > 45 A)",
                        valor_registrado=corr, limite_umbral=45.0, estado="Activa"
                    ))
                db.commit()

            print("✔ Operación activa inicial y mediciones de prueba sembradas exitosamente!")

        print("\n🎉 ¡Sembrado de datos finalizado con éxito!")

    except Exception as e:
        db.rollback()
        err_msg = str(e)
        if "Connection refused" in err_msg or "Is the server running" in err_msg:
            print("\n" + "="*70)
            print("⚠️ NO SE ENCONTRÓ DOCKER NI POSTGRESQL EN LOCALHOST:5432")
            print("="*70)
            print("Para probar inmediatamente SIN instalar Docker ni PostgreSQL, ejecuta:")
            print("\n  👉 $env:USE_SQLITE='true'; python scripts/seed_data.py\n")
            print("Si tienes Docker o PostgreSQL instalado, inicia el servicio o ejecuta:")
            print("\n  👉 docker compose up\n")
            print("="*70 + "\n")
        else:
            print(f"❌ Error durante el sembrado de datos: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()


