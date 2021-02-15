  
<?php
use Doctrine\ORM\Mapping as ORM;
/**
 * @ORM\Entity 
 * @ORM\Table(name="organizations")
 */
class MockMosaic
{
    /** @ORM\Id 
    * @ORM\Column(type="integer") 
     * @ORM\GeneratedValue */
    protected $id;

    /** @ORM\Column(type="string") */
    protected $name;

    /** @ORM\Column(type="boolean") */
    protected $visible;

    /** @ORM\Column(type="boolean") */
    protected $members;

    /** @ORM\Column(type="boolean") */
    protected $roles;

    /** @ORM\Column(type="boolean") */
    protected $projects;



    public function getId()
    {
        return $this->id;
    }

    public function getName()
    {
        return $this->name;
    }
    
    public function setName($name)
    {
        $this->name = $name;
    }
}
