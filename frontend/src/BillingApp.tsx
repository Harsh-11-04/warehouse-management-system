
import { Outlet, useNavigate } from 'react-router-dom'
import BillingLayout from './layout/BillingLayout'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { setUser, UserSlicePath } from './provider/slice/user.slice'
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { IoLogOutOutline } from "react-icons/io5";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import { collapsedSidebar, toggleSidebar } from './provider/slice/Sidebar.slice'
import { removeUser } from './provider/slice/user.slice'

function BillingApp() {
  const [loading, SetLoading] = useState(true)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const selector = useSelector(UserSlicePath)

  const fetchUser = async (token: string) => {
    try {
      const { data } = await axios.get(import.meta.env.VITE_BACKEND_URL + "/auth/profile", {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      dispatch(setUser({
        ...data.user,
        shop: data.shop || null
      }));
      SetLoading(false)
      return
    } catch (error) {
      console.log(error);
      localStorage.removeItem('token')
      dispatch(removeUser())
      navigate("/login")
      return
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token") || ''
    if (!token) {
      dispatch(removeUser())
      navigate("/login")
      return
    } else {
      if (selector?.email) {
        SetLoading(false)
        return
      } else {
        (async () => {
          await fetchUser(token);
        })()
      }
    }
  }, [])

  const logoutHandler = () => {
    try {
      localStorage.removeItem('token')
      dispatch(removeUser())
      navigate("/login");
    } catch (error) {
      console.log(error instanceof Error ? error.message : String(error))
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">loading....</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Billing Header */}
      <header className="py-3 px-4 md:px-8 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="nav flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className='lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors' onClick={() => dispatch(toggleSidebar())}><HiOutlineMenuAlt3 className='text-3xl text-gray-600' /></button>
            <button className='hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors' onClick={() => dispatch(collapsedSidebar())}><HiOutlineMenuAlt3 className='text-3xl text-gray-600' /></button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <RiMoneyDollarCircleLine className="text-white text-lg" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent hidden sm:inline">
                Billing
              </span>
            </div>
          </div>
          <div className="end flex items-center gap-3">
            {selector?.email && (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                  {selector.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-700 font-medium text-sm">{selector.email}</span>
                  <span className="text-gray-400 text-[11px] uppercase tracking-wider">
                    {selector.role}{selector.shop?.code ? ` • ${selector.shop.code}` : ''}
                  </span>
                </div>
              </div>
            )}
            <button title='logout' className='p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors' onClick={logoutHandler}><IoLogOutOutline className='text-2xl' /></button>
          </div>
        </div>
      </header>
      <BillingLayout>
        <Outlet />
      </BillingLayout>
    </div>
  )
}

export default BillingApp
