"""
Módulo de Confiabilidad Operativa e Indicadores Clave de Desempeño (KPIs):
- Horas Acumuladas de Operación por Bomba
- MTBF (Mean Time Between Failures / Tiempo Medio Entre Fallas)
- MTTR (Mean Time To Repair / Tiempo Medio De Reparación)
- Disponibilidad y Confiabilidad R(t)
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta

class ReliabilityCalculator:
    @staticmethod
    def calculate_operating_hours(total_operations_count: int, avg_op_duration_hours: float = 6.0) -> float:
        """Calcula el acumulado de horas de operación de una bomba centrífuga."""
        return total_operations_count * avg_op_duration_hours

    @staticmethod
    def calculate_mtbf(total_operating_hours: float, failure_count: int) -> float:
        """
        MTBF = Total Horas de Operación / Número de Fallas (Eventos de Alarma Críticos)
        """
        if failure_count == 0:
            return total_operating_hours if total_operating_hours > 0 else 1000.0  # High reliability benchmark
        return round(total_operating_hours / failure_count, 2)

    @staticmethod
    def calculate_mttr(total_downtime_hours: float, failure_count: int) -> float:
        """
        MTTR = Total Horas en Reparación / Número de Fallas
        """
        if failure_count == 0:
            return 0.0
        return round(total_downtime_hours / failure_count, 2)

    @classmethod
    def get_pump_reliability_metrics(cls, pump_id: int, total_ops: int, failure_count: int) -> Dict[str, Any]:
        op_hours = cls.calculate_operating_hours(total_ops)
        mtbf = cls.calculate_mtbf(op_hours, failure_count)
        mttr = cls.calculate_mttr(failure_count * 2.5, failure_count)  # Est. 2.5h repair per failure
        availability = round((mtbf / (mtbf + mttr)) * 100, 2) if (mtbf + mttr) > 0 else 100.0

        return {
            "pump_id": pump_id,
            "total_operating_hours": op_hours,
            "failure_count": failure_count,
            "mtbf_hours": mtbf,
            "mttr_hours": mttr,
            "availability_percent": availability
        }
