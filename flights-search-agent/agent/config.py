"""
Configuration management for the Flight Search Agent.
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 5000  # Note: Heroku overrides this with $PORT env var
    log_level: str = "INFO"
    
    # AWS Bedrock Configuration
    aws_region: str = "us-east-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    bedrock_model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    
    # MCP Server Configuration
    mcp_server_url: str = "http://localhost:8080"
    mcp_enabled: bool = True
    
    # Application Settings
    app_name: str = "Flight Search Agent"
    environment: str = "development"
    
    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment.lower() == "development"
    
    def export_aws_credentials_to_env(self):
        """Export AWS credentials to environment variables for boto3."""
        if self.aws_access_key_id:
            os.environ['AWS_ACCESS_KEY_ID'] = self.aws_access_key_id
        if self.aws_secret_access_key:
            os.environ['AWS_SECRET_ACCESS_KEY'] = self.aws_secret_access_key
        if self.aws_region:
            os.environ['AWS_REGION'] = self.aws_region
            os.environ['AWS_DEFAULT_REGION'] = self.aws_region


# Global settings instance
settings = Settings()

# Export AWS credentials to environment so boto3 can find them
settings.export_aws_credentials_to_env()
