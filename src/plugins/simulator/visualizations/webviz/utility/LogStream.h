/**
 * @file <argos3/plugins/simulator/visualizations/webviz/utility/LogStream.h>
 *
 * @author Prajankya Sonar - <prajankya@gmail.com>
 *
 * MIT License
 * Copyright (c) 2020 NEST Lab
 */

#ifndef ARGOS_WEBVIZ_LOG_STREAM_H
#define ARGOS_WEBVIZ_LOG_STREAM_H

#include <argos3/core/simulator/simulator.h>
#include <argos3/core/simulator/space/space.h>
#include <argos3/core/utility/string_utilities.h>

#include <functional>

namespace argos {
  namespace Webviz {
    class CLogStream : public std::basic_streambuf<char> {
     public:
      CLogStream(
        std::ostream& c_stream,
        std::function<void(std::string)> f_callback_function)
          : m_cStream(c_stream),
            m_cSpace(CSimulator::GetInstance().GetSpace()),
            m_fCallback(f_callback_function) {
        /* Copy the original stream buffer */
        m_pcOldStream = m_cStream.rdbuf();
        /* Replace the streambuffer */

        m_cStream.rdbuf(this);
      }

      /****************************************/
      /****************************************/

      virtual ~CLogStream() {
        /* Replace old buffer */
        m_cStream.rdbuf(m_pcOldStream);
      }

      /****************************************/
      /****************************************/

      virtual int_type overflow(int_type t_value) {
        if (t_value == '\n') {
          std::string strTmp(m_strBuffer);
          Replace(strTmp, "<", "&lt;");
          Replace(strTmp, ">", "&gt;");
          strTmp = "<b>[t=" + ToString(m_cSpace.GetSimulationClock()) +
                   "]</b> " + strTmp;

          /* Call the callback function to send log data */
          m_fCallback(strTmp.c_str());

          m_strBuffer.erase(m_strBuffer.begin(), m_strBuffer.end());
        } else {
          m_strBuffer += t_value;
        }
        return t_value;
      }

      /****************************************/
      /****************************************/

      virtual std::streamsize xsputn(
        const char* pc_message, std::streamsize un_size) {
        /* Add the message to text stream */
        m_strBuffer.append(pc_message, pc_message + un_size);
        size_t nPos = 0;
        do {
          /* Look for a newline */
          nPos = m_strBuffer.find('\n');
          if (nPos != std::string::npos) {
            /* Newline found: display text from the beginning of the stream till
             * the newline */
            /* Get the portion to display */
            std::string strTmp(m_strBuffer.begin(), m_strBuffer.begin() + nPos);
            /* Format the text to display */
            Replace(strTmp, "<", "&lt;");
            Replace(strTmp, ">", "&gt;");
            strTmp = "<b>[t=" + ToString(m_cSpace.GetSimulationClock()) +
                     "]</b> " + strTmp;

            /* Call the callback function to send log data */
            m_fCallback(strTmp.c_str());

            /* Erase the displayed portion from the text stream */
            m_strBuffer.erase(
              m_strBuffer.begin(), m_strBuffer.begin() + nPos + 1);
          }
        } while (nPos != std::string::npos);
        /* No more newlines found, return */
        return un_size;
      }

     private:
      std::ostream& m_cStream;
      std::streambuf* m_pcOldStream;
      std::string m_strBuffer;
      CSpace& m_cSpace;
      std::function<void(std::string)> m_fCallback;
    };
  }  // namespace Webviz
}  // namespace argos

#endif
