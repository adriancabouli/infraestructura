
import pandas as pd

df = pd.read_csv('expedientes.csv', dtype=str)

# limpiar anio: "2023.0" -> "2023"
if 'anio' in df.columns:
    df['anio'] = df['anio'].str.replace(r'\.0$', '', regex=True)
    df.loc[df['anio'].isin(['nan', 'None', '']), 'anio'] = ''

df.to_csv('expedientes.csv', index=False)
print('OK: expedientes.csv limpio (anio sin .0)')
