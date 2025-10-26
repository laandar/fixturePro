import { appName, author, currentYear } from '@/helpers'
import { Col, Container, Row } from 'react-bootstrap'

const Footer = () => {
  return (
    <footer className="footer">
      <Container fluid>
        <Row>
          <Col md={6} className="text-center text-md-start">
            © {currentYear} {appName} By <span className="fw-semibold">{author}</span>
          </Col>
          
        </Row>
      </Container>
    </footer>
  )
}

export default Footer
