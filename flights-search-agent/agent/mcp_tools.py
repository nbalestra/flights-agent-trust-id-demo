"""
Mock MCP (Model Context Protocol) server tools for flight search.
This module provides mock implementations until the real MCP server is ready.
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)


class MockFlightData:
    """Mock flight data generator for testing."""
    
    AIRLINES = [
        "American Airlines", "Delta Airlines", "United Airlines",
        "Southwest Airlines", "JetBlue", "Alaska Airlines",
        "Spirit Airlines", "Frontier Airlines"
    ]
    
    AIRPORTS = {
        "NYC": ["JFK", "LGA", "EWR"],
        "New York": ["JFK", "LGA", "EWR"],
        "LON": ["LHR", "LGW", "STN"],
        "London": ["LHR", "LGW", "STN"],
        "LAX": ["LAX"],
        "Los Angeles": ["LAX"],
        "SFO": ["SFO"],
        "San Francisco": ["SFO"],
        "ORD": ["ORD"],
        "Chicago": ["ORD"],
        "MIA": ["MIA"],
        "Miami": ["MIA"],
        "BOS": ["BOS"],
        "Boston": ["BOS"],
        "SEA": ["SEA"],
        "Seattle": ["SEA"],
        "ATL": ["ATL"],
        "Atlanta": ["ATL"],
        "DFW": ["DFW"],
        "Dallas": ["DFW"],
    }
    
    @classmethod
    def normalize_location(cls, location: str) -> Optional[str]:
        """Normalize location name to airport code."""
        location = location.strip().upper()
        
        # Direct match
        if location in cls.AIRPORTS:
            return cls.AIRPORTS[location][0]
        
        # Case-insensitive match
        for key, codes in cls.AIRPORTS.items():
            if location.upper() == key.upper():
                return codes[0]
            if location in codes:
                return location
        
        return None
    
    @classmethod
    def generate_mock_flights(
        cls,
        origin: str,
        destination: str,
        budget: Optional[float] = None,
        num_flights: int = 5
    ) -> List[Dict[str, Any]]:
        """Generate mock flight search results."""
        
        origin_code = cls.normalize_location(origin) or origin[:3].upper()
        dest_code = cls.normalize_location(destination) or destination[:3].upper()
        
        flights = []
        base_date = datetime.now() + timedelta(days=7)
        
        for i in range(num_flights):
            departure = base_date + timedelta(days=i, hours=random.randint(6, 20))
            duration = timedelta(hours=random.randint(2, 12), minutes=random.choice([0, 30]))
            arrival = departure + duration
            
            # Generate price
            base_price = random.randint(200, 1500)
            if budget:
                # Generate some flights within budget and some outside
                if i < num_flights // 2:
                    price = random.randint(int(budget * 0.5), int(budget * 0.95))
                else:
                    price = random.randint(int(budget * 0.8), int(budget * 1.3))
            else:
                price = base_price
            
            flight = {
                "flight_number": f"{random.choice(cls.AIRLINES)[:2].upper()}{random.randint(100, 999)}",
                "airline": random.choice(cls.AIRLINES),
                "origin": origin_code,
                "destination": dest_code,
                "departure_time": departure.isoformat(),
                "arrival_time": arrival.isoformat(),
                "duration_minutes": int(duration.total_seconds() / 60),
                "price": price,
                "currency": "USD",
                "stops": random.choice([0, 0, 0, 1]),  # 75% direct flights
                "cabin_class": random.choice(["Economy", "Economy", "Premium Economy", "Business"]),
                "available_seats": random.randint(5, 50)
            }
            flights.append(flight)
        
        # Sort by price
        flights.sort(key=lambda x: x["price"])
        
        # Filter by budget if specified
        if budget:
            flights = [f for f in flights if f["price"] <= budget]
        
        return flights


class MCPClient:
    """Mock MCP client for flight search operations."""
    
    def __init__(self, server_url: str, enabled: bool = True):
        """
        Initialize MCP client.
        
        Args:
            server_url: URL of the MCP server
            enabled: Whether MCP is enabled (use mock if disabled)
        """
        self.server_url = server_url
        self.enabled = enabled
        logger.info(f"MCP Client initialized (server_url={server_url}, enabled={enabled})")
    
    async def search_flights(
        self,
        origin: str,
        destination: str,
        budget: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Search for flights using MCP server (currently mocked).
        
        Args:
            origin: Origin airport or city
            destination: Destination airport or city
            budget: Maximum budget for the flight
            
        Returns:
            Dictionary containing flight search results
        """
        logger.info(f"Searching flights: {origin} -> {destination}, budget={budget}")
        
        # TODO: Replace with actual MCP server call when ready
        # For now, use mock data
        flights = MockFlightData.generate_mock_flights(origin, destination, budget)
        
        return {
            "success": True,
            "origin": origin,
            "destination": destination,
            "budget": budget,
            "flights_found": len(flights),
            "flights": flights,
            "timestamp": datetime.now().isoformat(),
            "source": "mock" if not self.enabled else "mcp"
        }


def create_flight_search_tool_description() -> str:
    """Create the tool description for LangChain."""
    return """Search for flights based on origin, destination, and budget.

Parameters:
- origin (str): The origin city or airport code (e.g., 'NYC', 'New York', 'JFK')
- destination (str): The destination city or airport code (e.g., 'London', 'LAX')
- budget (float, optional): Maximum budget in USD

Returns:
- A dictionary with flight search results including available flights, prices, times, and airlines.

Example usage:
- search_flights(origin="New York", destination="London", budget=500)
- search_flights(origin="LAX", destination="NYC", budget=300)
"""
