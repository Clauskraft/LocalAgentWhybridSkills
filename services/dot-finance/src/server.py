
from fastapi import FastAPI
import uvicorn
import pandas as pd
import numpy as np
import os

app = FastAPI(title="Dot.Finance", version="0.1.0")

@app.get("/")
def read_root():
    return {"status": "active", "agent": "Dot.Finance", "role": "CFO"}

@app.post("/analyze/ledger")
def analyze_ledger(data: dict):
    # Stub for ledger analysis
    return {"status": "analyzed", "anomalies": [], "insight": "No data provided in stub mode."}

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
