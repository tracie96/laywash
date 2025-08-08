"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../../context/SidebarContext";
import { useAuth } from "../../context/AuthContext";
import {
  GridIcon,
  UserCircleIcon,
  ChevronDownIcon,
  HorizontaLDots,
  DollarIcon,
  CarIcon,
  ToolIcon,
  StockIcon,
  ReportIcon,
} from "../../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  roles: string[];
};

const superAdminItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
    roles: ['super_admin'],
  },
  {
    icon: <UserCircleIcon />,
    name: "User Management",
    subItems: [
      { name: "Manage Admins", path: "/users/admins", pro: false },
      { name: "Manage Washers", path: "/users/washers", pro: false },
    ],
    roles: ['super_admin'],
  },
  {
    icon: <DollarIcon />,
    name: "Financial",
    subItems: [
      { name: "Payment History", path: "/financial/payments", pro: false },
      { name: "Reports", path: "/financial/reports", pro: false },
      { name: "Bonuses", path: "/financial/bonuses", pro: false },
    ],
    roles: ['super_admin'],
  },
  {
    icon: <CarIcon />,
    name: "Operations",
    subItems: [
      { name: "All Check-ins", path: "/operations/checkins", pro: false },
      { name: "Customer Database", path: "/operations/customers", pro: false },
      { name: "Services", path: "/operations/services", pro: false },
    ],
    roles: ['super_admin'],
  },
  {
    icon: <StockIcon />,
    name: "Stock Management",
    path: "/stock",
    roles: ['super_admin'],
  },
  {
    icon: <ToolIcon />,
    name: "Tools & Equipment",
    subItems: [
      { name: "Tool Management", path: "/tools/management", pro: false },
      { name: "Tool Assignments", path: "/tools/assignments", pro: false },
      { name: "Lost Tool Charges", path: "/tools/charges", pro: false },
    ],
    roles: ['super_admin'],
  },
  {
    icon: <ReportIcon />,
    name: "Reports & Analytics",
    subItems: [
      { name: "Sales Reports", path: "/reports/sales", pro: false },
      { name: "Performance Reports", path: "/reports/performance", pro: false },
      { name: "Stock Reports", path: "/reports/stock", pro: false },
    ],
    roles: ['super_admin'],
  },
];

const adminItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
    roles: ['admin'],
  },
  {
    icon: <CarIcon />,
    name: "Car Check-ins",
    subItems: [
      { name: "New Check-in", path: "/checkins/new", pro: false },
      { name: "Active Check-ins", path: "/checkins/active", pro: false },
      { name: "Check-in History", path: "/checkins/history", pro: false },
    ],
    roles: ['admin'],
  },
  {
    icon: <UserCircleIcon />,
    name: "Customer Management",
    subItems: [
      { name: "Register Customer", path: "/customers/new", pro: false },
      { name: "Customer Database", path: "/customers/list", pro: false },
    ],
    roles: ['admin'],
  },
  {
    icon: <UserCircleIcon />,
    name: "Worker Management",
    subItems: [
      { name: "View Workers", path: "/workers/list", pro: false },
      { name: "Edit Workers", path: "/workers/edit", pro: false },
    ],
    roles: ['admin'],
  },
  {
    icon: <StockIcon />,
    name: "Stock Management",
    subItems: [
      { name: "Update Stock", path: "/stock/update", pro: false },
      { name: "Stock Inventory", path: "/stock/inventory", pro: false },
    ],
    roles: ['admin'],
  },
  {
    icon: <DollarIcon />,
    name: "Payments",
    subItems: [
      { name: "Payment History", path: "/payments/history", pro: false },
      { name: "Daily Reports", path: "/payments/reports", pro: false },
    ],
    roles: ['admin'],
  },
];

const washerItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
    roles: ['car_washer'],
  },
  {
    icon: <CarIcon />,
    name: "My Assignments",
    subItems: [
      { name: "Current Assignments", path: "/assignments/current", pro: false },
      { name: "Completed Cars", path: "/assignments/completed", pro: false },
    ],
    roles: ['car_washer'],
  },
  {
    icon: <DollarIcon />,
    name: "Income",
    subItems: [
      { name: "Daily Income", path: "/income/daily", pro: false },
      { name: "Income History", path: "/income/history", pro: false },
    ],
    roles: ['car_washer'],
  },
  {
    icon: <UserCircleIcon />,
    name: "Profile",
    subItems: [
      { name: "My Profile", path: "/profile", pro: false },
      { name: "Performance History", path: "/profile/performance", pro: false },
    ],
    roles: ['car_washer'],
  },
];

const CarWashSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { user, hasRole } = useAuth();

  // Get navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (hasRole('super_admin')) {
      return superAdminItems;
    } else if (hasRole('admin')) {
      return adminItems;
    } else if (hasRole('car_washer')) {
      return washerItems;
    }
    return [];
  };

  const navItems = getNavItems();

  // State for submenu functionality
  const [openSubmenu, setOpenSubmenu] = React.useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = React.useState<Record<number, number>>({});
  const subMenuRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const manuallyOpenedRef = React.useRef<boolean>(false);

  const isActive = (path: string) => path === pathname;

  const handleSubmenuToggle = (index: number) => {
    console.log('Submenu toggle clicked for index:', index);
    manuallyOpenedRef.current = true;
    setOpenSubmenu((prevOpenSubmenu) => {
      const newValue = prevOpenSubmenu === index ? null : index;
      console.log('Setting openSubmenu from', prevOpenSubmenu, 'to', newValue);
      return newValue;
    });
    
    // Reset the manually opened flag after a short delay
    setTimeout(() => {
      manuallyOpenedRef.current = false;
    }, 100);
  };

  const renderMenuItems = (navItems: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index)}
              className={`menu-item group ${
                openSubmenu === index ? "menu-item-active" : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >

              <span
                className={`${
                  openSubmenu === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu === index
                      ? "rotate-180 text-green-light-600 dark:text-green-light-300"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (
            <div
              ref={(el) => {
                subMenuRefs.current[index] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu === index
                    ? `${subMenuHeight[index] || 200}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9 border-l-2 border-green-light-200 dark:border-green-light-700/40 pl-4">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  React.useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu(index);
            submenuMatched = true;
            manuallyOpenedRef.current = false; // Reset the flag when navigating to a submenu page
          }
        });
      }
    });

    // Only close the submenu if we're navigating to a page that's not in any submenu
    // AND the user hasn't manually opened it
    if (!submenuMatched && !manuallyOpenedRef.current) {
      setOpenSubmenu(null);
    }
  }, [pathname, navItems, isActive]);

  React.useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    console.log('openSubmenu changed to:', openSubmenu);
    if (openSubmenu !== null) {
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        if (subMenuRefs.current[openSubmenu]) {
          const height = subMenuRefs.current[openSubmenu]?.scrollHeight || 0;
          console.log('Calculated height for submenu', openSubmenu, ':', height);
          setSubMenuHeight((prevHeights) => ({
            ...prevHeights,
            [openSubmenu]: height,
          }));
        } else {
          console.log('Submenu ref not found for index:', openSubmenu);
        }
      }, 0);
    }
  }, [openSubmenu]);

  // Debug effect to log state changes
  React.useEffect(() => {
    console.log('Current state - openSubmenu:', openSubmenu, 'subMenuHeight:', subMenuHeight);
  }, [openSubmenu, subMenuHeight]);

  if (!user) return null;

  return (
    <aside
    className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
      ${
        isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
          ? "w-[290px]"
          : "w-[90px]"
      }
      ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex dark:border-green-light-800/30 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/dashboard">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.png"
                alt="Car Wash Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.png"
                alt="Car Wash Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Car Wash Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-500 dark:text-gray-400 font-semibold tracking-wider ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems)}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default CarWashSidebar; 