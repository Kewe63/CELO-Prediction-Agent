import { useEffect, useRef, useState } from 'react';

export function Entropy({ className = "" }) {
  const canvasRef = useRef(null);
  
  // Use state to track window size
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Using a subtle gray/white theme for background
    const particleColor = '#ffffff';

    class Particle {
      constructor(x, y, order) {
        this.x = x;
        this.y = y;
        this.originalX = x;
        this.originalY = y;
        this.size = 2;
        this.order = order;
        this.velocity = {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        };
        this.influence = 0;
        this.neighbors = [];
      }

      update(width, height) {
        if (this.order) {
          const dx = this.originalX - this.x;
          const dy = this.originalY - this.y;

          const chaosInfluence = { x: 0, y: 0 };
          this.neighbors.forEach(neighbor => {
            if (!neighbor.order) {
              const distance = Math.hypot(this.x - neighbor.x, this.y - neighbor.y);
              const strength = Math.max(0, 1 - distance / 100);
              chaosInfluence.x += (neighbor.velocity.x * strength);
              chaosInfluence.y += (neighbor.velocity.y * strength);
              this.influence = Math.max(this.influence, strength);
            }
          });

          this.x += dx * 0.05 * (1 - this.influence) + chaosInfluence.x * this.influence;
          this.y += dy * 0.05 * (1 - this.influence) + chaosInfluence.y * this.influence;

          this.influence *= 0.99;
        } else {
          this.velocity.x += (Math.random() - 0.5) * 0.5;
          this.velocity.y += (Math.random() - 0.5) * 0.5;
          this.velocity.x *= 0.95;
          this.velocity.y *= 0.95;
          this.x += this.velocity.x;
          this.y += this.velocity.y;

          if (this.x < width / 2 || this.x > width) this.velocity.x *= -1;
          if (this.y < 0 || this.y > height) this.velocity.y *= -1;
          this.x = Math.max(width / 2, Math.min(width, this.x));
          this.y = Math.max(0, Math.min(height, this.y));
        }
      }

      draw(ctx) {
        const alpha = this.order ?
          0.8 - this.influence * 0.5 :
          0.8;
        // Make particles slightly transparent so they don't overpower the UI  
        ctx.fillStyle = `${particleColor}${Math.round(alpha * 120).toString(16).padStart(2, '0')}`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const particles = [];
    const gridSizeX = Math.floor(width / 30);
    const gridSizeY = Math.floor(height / 30);
    const spacingX = width / gridSizeX;
    const spacingY = height / gridSizeY;

    for (let i = 0; i < gridSizeX; i++) {
      for (let j = 0; j < gridSizeY; j++) {
        const x = spacingX * i + spacingX / 2;
        const y = spacingY * j + spacingY / 2;
        const order = x < width / 2;
        particles.push(new Particle(x, y, order));
      }
    }

    function updateNeighbors() {
      particles.forEach(particle => {
        particle.neighbors = particles.filter(other => {
          if (other === particle) return false;
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          return distance < 100;
        });
      });
    }

    let time = 0;
    let animationId;
    
    function animate() {
      ctx.clearRect(0, 0, width, height);

      if (time % 30 === 0) {
        updateNeighbors();
      }

      particles.forEach(particle => {
        particle.update(width, height);
        particle.draw(ctx);

        particle.neighbors.forEach(neighbor => {
          const distance = Math.hypot(particle.x - neighbor.x, particle.y - neighbor.y);
          if (distance < 50) {
            const alpha = 0.1 * (1 - distance / 50);
            ctx.strokeStyle = `${particleColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(neighbor.x, neighbor.y);
            ctx.stroke();
          }
        });
      });

      // Split line
      ctx.strokeStyle = `${particleColor}1A`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      ctx.font = '16px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.textAlign = 'center';
      ctx.fillText('CHAOS', (width / 4) * 3, height - 30);

      time++;
      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [dimensions]);

  return (
    <div 
      className={className} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw', 
        height: '100vh', 
        zIndex: -1,
        backgroundColor: 'transparent',
        pointerEvents: 'none',
        overflow: 'hidden',
        filter: 'blur(3px)'
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
