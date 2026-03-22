
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import { useSelector, useDispatch } from 'react-redux';
import { SidebarSlicePath, toggleSidebar } from '../provider/slice/Sidebar.slice';
import { UserSlicePath } from '../provider/slice/user.slice';
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { FiUser } from "react-icons/fi";
import { IoIosArrowDropright, IoIosArrowDropleft } from "react-icons/io";
import { BsBoxes } from "react-icons/bs";
import { BiTransfer } from 'react-icons/bi'
import { HiOutlineReceiptPercent } from 'react-icons/hi2'
import { TbReportAnalytics } from 'react-icons/tb'
import { VscHistory } from "react-icons/vsc";

import { IoArrowBack } from 'react-icons/io5'
import { Link } from 'react-router-dom';

const BillingLayout = ({ children }: { children: React.ReactNode }) => {
  const selector = useSelector(SidebarSlicePath)
  const dispatch = useDispatch()
  const user = useSelector(UserSlicePath) as { role?: string } | null;
  const isWorker = user?.role === 'warehouse_staff';

  return (
    <>
      <div className="flex items-start lg:gap-x-2">
        <Sidebar collapsed={selector.collapsed} breakPoint="lg" toggled={selector.toggle}>
          <Menu>
            <MenuItem className="lg:hidden" onClick={() => dispatch(toggleSidebar())}>
              {selector.toggle ? <IoIosArrowDropright className="text-2xl" /> : <IoIosArrowDropleft className="text-2xl" />}
            </MenuItem>

            {!isWorker && <MenuItem component={<Link to="/billing" />} icon={<MdOutlineSpaceDashboard className="text-2xl" />}>Dashboard</MenuItem>}
            <MenuItem component={<Link to="/billing/customers" />} icon={<FiUser className="text-2xl" />}>Customers</MenuItem>
            <MenuItem component={<Link to="/billing/products" />} icon={<BsBoxes className="text-2xl" />}>Products</MenuItem>
            <MenuItem component={<Link to="/billing/new-invoice" />} icon={<HiOutlineReceiptPercent className="text-2xl" />}>New Invoice</MenuItem>
            {!isWorker && <MenuItem component={<Link to="/billing/stock" />} icon={<BiTransfer className="text-2xl" />}>Stock Manage</MenuItem>}
            {!isWorker && <MenuItem component={<Link to="/billing/reports" />} icon={<TbReportAnalytics className="text-2xl" />}>Reports</MenuItem>}
            {!isWorker && <MenuItem component={<Link to="/billing/activity" />} icon={<VscHistory className="text-2xl" />}>Activity Tracker</MenuItem>}

            {!isWorker && (
              <div className="mt-4 border-t border-gray-200 pt-2">
                <div className="px-5 py-2 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">Admin</div>
                <MenuItem component={<Link to="/billing/admin" />} icon={<MdOutlineSpaceDashboard className="text-xl" />}>Cloud Dashboard</MenuItem>
                <MenuItem component={<Link to="/billing/admin/sync-audit" />} icon={<VscHistory className="text-xl" />}>Sync Audit</MenuItem>
              </div>
            )}

            {!isWorker && (
              <div className="mt-4 border-t border-gray-200 pt-2">
                <MenuItem component={<Link to="/" />} icon={<IoArrowBack className="text-xl" />}>
                  Back to Warehouse
                </MenuItem>
              </div>
            )}
          </Menu>
        </Sidebar>
        <div className="w-full min-w-0 overflow-x-hidden">
          {children}
        </div>
      </div>
    </>
  )
}

export default BillingLayout
