import React, { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    title: "The Problem",
    content: (
      <div className="text-center space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Fastest != Best</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Standard transit routing APIs optimize exclusively for time and distance. They ignore stairs, crowding, walking surfaces, and active outages.
        </p>
        <div className="p-6 bg-red-50 text-red-800 rounded-xl max-w-lg mx-auto border border-red-200">
          "A 5-minute faster route with broken elevators is an unusable route."
        </div>
      </div>
    )
  },
  {
    title: "The Solution: ACCESS Profile",
    content: (
      <div className="space-y-6">
        <div className="flex justify-center mb-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-indigo-500 text-indigo-700 text-3xl font-bold">Aa</div>
            <h3 className="text-xl font-bold">Aarav</h3>
            <p className="text-gray-500">Commuter</p>
          </div>
        </div>
        <Card className="p-6 max-w-md mx-auto bg-gray-50 border-indigo-100 border-2">
          <h4 className="font-bold text-lg mb-4 text-center border-b pb-2">Accessibility Profile</h4>
          <ul className="space-y-3">
            <li className="flex justify-between"><span className="text-gray-600">Mobility Aid</span><span className="font-semibold text-indigo-700">Manual Wheelchair</span></li>
            <li className="flex justify-between"><span className="text-gray-600">Stair Tolerance</span><span className="font-semibold text-red-600">None (Avoid)</span></li>
            <li className="flex justify-between"><span className="text-gray-600">Max Walking Distance</span><span className="font-semibold">300m</span></li>
            <li className="flex justify-between"><span className="text-gray-600">Crowd Tolerance</span><span className="font-semibold">Medium</span></li>
          </ul>
        </Card>
      </div>
    )
  },
  {
    title: "Route Re-ranking Engine",
    content: (
      <div className="space-y-8 max-w-3xl mx-auto">
        <p className="text-center text-lg text-gray-600 mb-8">
          The ACCESS Evaluation Engine scores standard routing results against the user's profile.
        </p>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-gray-50 opacity-50 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-2 bg-red-500"></div>
            <div>
              <div className="font-bold text-gray-900 flex items-center"><span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs mr-2">C1</span> Fastest Route (12m)</div>
              <div className="text-sm text-gray-500">Contains stairs at transfer</div>
            </div>
            <div className="text-right">
              <div className="text-red-500 font-bold text-xl">12%</div>
              <div className="text-xs text-gray-500">Match</div>
            </div>
          </div>

          <div className="p-4 border-2 border-indigo-500 rounded-lg bg-indigo-50 flex justify-between items-center relative overflow-hidden transform scale-105 shadow-md">
            <div className="absolute top-0 left-0 bottom-0 w-2 bg-green-500"></div>
            <div>
              <div className="font-bold text-indigo-900 flex items-center"><span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs mr-2">C3</span> Recommended Route (18m)</div>
              <div className="text-sm text-indigo-700">Fully accessible, ramp verified</div>
            </div>
            <div className="text-right">
              <div className="text-green-600 font-bold text-xl">98%</div>
              <div className="text-xs text-indigo-500">Match</div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Live Action",
    content: (
      <div className="text-center space-y-8">
        <h2 className="text-3xl font-bold text-gray-900">Let's see it live.</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          We will start a journey, inject a live accessibility failure using the Operator Dashboard, and watch the system automatically recalculate.
        </p>
        <div className="pt-8">
          <Link to="/demo/scenarios">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-4 h-auto rounded-full shadow-lg hover:shadow-xl transition-all">
              <Play className="mr-2" size={24} /> Start Scenarios
            </Button>
          </Link>
        </div>
      </div>
    )
  }
];

export default function DemoPitchPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/demo/scenarios');
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  return (
    <div className="min-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <Link to="/demo">
          <Button variant="ghost" size="sm" className="text-gray-500">Exit Presentation</Button>
        </Link>
        <div className="flex space-x-2">
          {SLIDES.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i === currentSlide ? 'bg-indigo-600' : 'bg-gray-300'}`} />
          ))}
        </div>
        <div className="text-sm text-gray-400 font-mono">
          {currentSlide + 1} / {SLIDES.length}
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-4xl px-8">
          <div className="text-center mb-12">
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold uppercase tracking-wider mb-4">
              Slide {currentSlide + 1}
            </span>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{SLIDES[currentSlide].title}</h1>
          </div>
          
          <div className="min-h-[300px] flex items-center justify-center">
            {SLIDES[currentSlide].content}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-12 border-t pt-6">
        <Button 
          variant="outline" 
          onClick={prevSlide} 
          disabled={currentSlide === 0}
          className="px-6 py-6"
        >
          <ChevronLeft className="mr-2" /> Previous
        </Button>
        <Button 
          onClick={nextSlide}
          className="px-8 py-6 bg-indigo-900 hover:bg-black text-white"
        >
          {currentSlide === SLIDES.length - 1 ? 'Start Demo' : 'Next'} <ChevronRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
