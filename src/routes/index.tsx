import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      gap: '2rem'
    }}>
      <h1>Find Time</h1>
      <Link
        to="/create"
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          textDecoration: 'none',
          border: 'none',
          borderRadius: '8px',
          background: '#646cff',
          color: 'white',
          display: 'inline-block',
        }}
      >
        Find time with your team
      </Link>
    </div>
  );
}
