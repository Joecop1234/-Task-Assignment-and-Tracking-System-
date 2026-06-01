import React from "react";
import { Outlet } from "react-router-dom";
import Nav from "./Nav";


function Template() {
  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <div className="flex flex-col min-h-screen">
        <Nav />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-100">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Template;