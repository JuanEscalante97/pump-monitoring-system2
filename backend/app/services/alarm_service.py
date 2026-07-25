from sqlalchemy.orm import Session
from app.models.models import Measurement, AlarmThreshold, AlarmEvent, Pump

def evaluate_measurement_alarms(db: Session, measurement: Measurement):
    """
    Evalúa una medición recién registrada contra los umbrales configurados para la bomba.
    Si excede los límites (Temp > 80°C, Corriente > 45 A, Presiones fuera de rango), genera eventos de alarma.
    """
    # Look for pump-specific threshold or global threshold (bomba_id IS NULL)
    threshold = db.query(AlarmThreshold).filter(
        AlarmThreshold.bomba_id == measurement.bomba_id,
        AlarmThreshold.is_active == True
    ).first()
    
    if not threshold:
        threshold = db.query(AlarmThreshold).filter(
            AlarmThreshold.bomba_id == None,
            AlarmThreshold.is_active == True
        ).first()

    # Default fallback values if no threshold in DB
    temp_max = threshold.temp_max_c if threshold else 80.0
    corriente_max = threshold.corriente_max_a if threshold else 45.0
    presion_suc_min = threshold.presion_suc_min_inhg if threshold else -10.0
    presion_suc_max = threshold.presion_suc_max_inhg if threshold else 30.0
    presion_desc_min = threshold.presion_desc_min_psi if threshold else 20.0
    presion_desc_max = threshold.presion_desc_max_psi if threshold else 150.0

    bomba = db.query(Pump).filter(Pump.id == measurement.bomba_id).first()
    bomba_codigo = bomba.codigo if bomba else f"Bomba {measurement.bomba_id}"

    created_alarms = []

    # 1. Temperatura Alta (> 80°C)
    if measurement.temperatura_c > temp_max:
        alarm = AlarmEvent(
            measurement_id=measurement.id,
            bomba_id=measurement.bomba_id,
            operacion_id=measurement.operation_id,
            tipo_alarma="Alta Temperatura Motor",
            nivel="ALARM",
            mensaje=f"¡CRÍTICO! Temperatura del motor en {bomba_codigo} excede límite ({measurement.temperatura_c}°C > {temp_max}°C)",
            valor_registrado=measurement.temperatura_c,
            limite_umbral=temp_max,
            estado="Activa"
        )
        db.add(alarm)
        created_alarms.append(alarm)

    # 1b. Temperatura Alta Bomba (> 80°C)
    if measurement.temperatura_bomba_c is not None and measurement.temperatura_bomba_c > temp_max:
        alarm = AlarmEvent(
            measurement_id=measurement.id,
            bomba_id=measurement.bomba_id,
            operacion_id=measurement.operation_id,
            tipo_alarma="Alta Temperatura Bomba",
            nivel="ALARM",
            mensaje=f"¡CRÍTICO! Temperatura de la bomba en {bomba_codigo} excede límite ({measurement.temperatura_bomba_c}°C > {temp_max}°C)",
            valor_registrado=measurement.temperatura_bomba_c,
            limite_umbral=temp_max,
            estado="Activa"
        )
        db.add(alarm)
        created_alarms.append(alarm)

    # 2. Corriente Alta (> 45 A)
    if measurement.corriente_a > corriente_max:
        alarm = AlarmEvent(
            measurement_id=measurement.id,
            bomba_id=measurement.bomba_id,
            operacion_id=measurement.operation_id,
            tipo_alarma="Alta Corriente Motor",
            nivel="ALARM",
            mensaje=f"¡ADVERTENCIA! Corriente de motor en {bomba_codigo} excede límite ({measurement.corriente_a} A > {corriente_max} A)",
            valor_registrado=measurement.corriente_a,
            limite_umbral=corriente_max,
            estado="Activa"
        )
        db.add(alarm)
        created_alarms.append(alarm)

    # 3. Presión de Succión fuera de rango
    if measurement.presion_succion_inhg is not None and (measurement.presion_succion_inhg < presion_suc_min or measurement.presion_succion_inhg > presion_suc_max):
        alarm = AlarmEvent(
            measurement_id=measurement.id,
            bomba_id=measurement.bomba_id,
            operacion_id=measurement.operation_id,
            tipo_alarma="Presión Succión Anormal",
            nivel="WARNING",
            mensaje=f"Presión de succión en {bomba_codigo} fuera de rango ({measurement.presion_succion_inhg} inHg)",
            valor_registrado=measurement.presion_succion_inhg,
            limite_umbral=presion_suc_max if measurement.presion_succion_inhg > presion_suc_max else presion_suc_min,
            estado="Activa"
        )
        db.add(alarm)
        created_alarms.append(alarm)

    # 4. Presión de Descarga fuera de rango
    if measurement.presion_descarga_psi < presion_desc_min or measurement.presion_descarga_psi > presion_desc_max:
        alarm = AlarmEvent(
            measurement_id=measurement.id,
            bomba_id=measurement.bomba_id,
            operacion_id=measurement.operation_id,
            tipo_alarma="Presión Descarga Anormal",
            nivel="WARNING",
            mensaje=f"Presión de descarga en {bomba_codigo} fuera de rango ({measurement.presion_descarga_psi} psi)",
            valor_registrado=measurement.presion_descarga_psi,
            limite_umbral=presion_desc_max if measurement.presion_descarga_psi > presion_desc_max else presion_desc_min,
            estado="Activa"
        )
        db.add(alarm)
        created_alarms.append(alarm)

    if created_alarms:
        db.commit()

    return created_alarms
